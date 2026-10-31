// Neon Beat Rush: sirve el juego y reenvía eventos de TikTok LIVE por WebSocket.
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const SIGN_KEY = process.env.EULER_API_KEY || undefined;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const cleanUser = u => String(u || '').trim().replace(/^@/, '').replace(/[^\w.]/g, '').slice(0, 40);
let tiktokUser = cleanUser(process.env.TIKTOK_USER);

const app = express();
app.use(express.json({ limit: '10kb' }));
// Estructura plana: solo se publican estos dos archivos (no el código del servidor)
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/three.min.js', (_req, res) => res.set('Cache-Control', 'public, max-age=86400').sendFile(path.join(__dirname, 'three.min.js')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

/* ---------- estado y difusión ---------- */
const status = { tiktok: 'idle', user: tiktokUser || null, detail: '' };
const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };
const broadcast = obj => { const s = JSON.stringify(obj); for (const c of wss.clients) if (c.readyState === 1) c.send(s); };
const setStatus = (tiktok, detail = '') => { status.tiktok = tiktok; status.user = tiktokUser || null; status.detail = detail; broadcast({ type: 'status', ...status }); console.log('[tiktok]', tiktok, tiktokUser || '', detail); };

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', () => {});
  send(ws, { type: 'status', ...status });
});
setInterval(() => {
  for (const c of wss.clients) { if (!c.isAlive) { c.terminate(); continue; } c.isAlive = false; try { c.ping(); } catch {} }
}, 25000);

/* ---------- API ---------- */
app.get('/health', (_req, res) => res.type('text').send('ok'));
app.get('/api/config', (_req, res) => res.json({ live: true, tiktokUser: tiktokUser || null }));
app.get('/api/status', (_req, res) => res.json({ clients: wss.clients.size, ...status }));
const keyOk = k => { if (!ADMIN_KEY || typeof k !== 'string') return false; const a = Buffer.from(k), b = Buffer.from(ADMIN_KEY); return a.length === b.length && crypto.timingSafeEqual(a, b); };
app.post('/api/tiktok', (req, res) => {
  if (!ADMIN_KEY) return res.status(403).json({ ok: false, error: 'Falta ADMIN_KEY en el servidor' });
  if (!keyOk(req.body?.key)) return res.status(401).json({ ok: false, error: 'Clave incorrecta' });
  const u = cleanUser(req.body?.user); if (!u) return res.status(400).json({ ok: false, error: 'Usuario no válido' });
  tiktokUser = u; res.json({ ok: true, user: u }); startTikTok(true);
});
app.post('/api/event', (req, res) => { // pruebas: envía un evento falso al juego
  if (!keyOk(req.body?.key)) return res.status(401).json({ ok: false });
  const { key, ...ev } = req.body; broadcast(ev); res.json({ ok: true });
});

/* ---------- TikTok LIVE ---------- */
let conn = null, retryTimer = null, retries = 0, generation = 0;
const userOf = d => String(d?.user?.uniqueId ?? d?.uniqueId ?? d?.user?.nickname ?? 'viewer').slice(0, 24);
function wire(c) {
  c.on(WebcastEvent.CHAT, d => broadcast({ type: 'chat', user: userOf(d), text: String(d?.comment ?? '').slice(0, 200) }));
  c.on(WebcastEvent.GIFT, d => {
    const gd = d?.giftDetails ?? {};
    const giftType = gd.giftType ?? d?.giftType;
    if (giftType === 1 && !d?.repeatEnd) return; // racha en curso: se cuenta al terminar
    broadcast({ type: 'gift', user: userOf(d), gift: String(gd.giftName ?? d?.giftName ?? 'regalo').slice(0, 30),
      count: Number(d?.repeatCount) || 1, diamonds: Number(gd.diamondCount ?? d?.diamondCount) || 1 });
  });
  c.on(WebcastEvent.LIKE, d => broadcast({ type: 'like', user: userOf(d), count: Number(d?.likeCount) || 1 }));
  c.on(WebcastEvent.FOLLOW, d => broadcast({ type: 'follow', user: userOf(d) }));
  c.on(WebcastEvent.SHARE, d => broadcast({ type: 'share', user: userOf(d) }));
  c.on(ControlEvent.ERROR, e => console.log('[tiktok] error', e?.info || e?.exception?.message || e));
}
function scheduleRetry(gen, why) {
  if (gen !== generation || !tiktokUser) return;
  clearTimeout(retryTimer); const wait = Math.min(60000, 5000 * 2 ** Math.min(retries++, 4));
  setStatus('retry', `${why} · reintento en ${Math.round(wait / 1000)} s`);
  retryTimer = setTimeout(() => startTikTok(false, gen), wait);
}
async function startTikTok(reset, genIn) {
  if (reset) { generation++; retries = 0; clearTimeout(retryTimer); try { await conn?.disconnect(); } catch {} conn = null; }
  const gen = genIn ?? generation; if (gen !== generation) return;
  if (!tiktokUser) return setStatus('idle', 'sin usuario de TikTok');
  setStatus('connecting');
  try {
    const c = new TikTokLiveConnection(tiktokUser, { signApiKey: SIGN_KEY, processInitialData: false });
    conn = c; wire(c);
    c.on(ControlEvent.DISCONNECTED, () => { if (gen === generation) scheduleRetry(gen, 'desconectado'); });
    await c.connect();
    if (gen !== generation) { try { await c.disconnect(); } catch {} return; }
    retries = 0; setStatus('connected');
  } catch (e) {
    const msg = String(e?.message || e); scheduleRetry(gen, /offline|not live/i.test(msg) ? 'el directo no está activo' : msg.slice(0, 80));
  }
}

process.on('unhandledRejection', e => console.log('[unhandledRejection]', e?.message || e));
process.on('uncaughtException', e => console.log('[uncaughtException]', e?.message || e));
server.listen(PORT, () => { console.log('Neon Beat Rush en puerto', PORT); startTikTok(true); });
