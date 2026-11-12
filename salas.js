// Neon Beat Rush · salas multijugador (v22).
// El servidor NO ejecuta el juego: solo agrupa jugadores en salas de hasta 4 y reenvía mensajes.
// El teléfono del anfitrión corre toda la partida; los invitados le mandan su posición y sus disparos.
import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';

const MAX_JUG = 4;                 // jugadores por sala
const MAX_SALAS = 150;             // salas a la vez en todo el servidor
const MAX_CONX_IP = 8;             // conexiones abiertas por IP
const CREAR_POR_HORA = 20;         // salas que una IP puede crear por hora
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // sin I ni O para no confundirlas con 1 y 0
const INACTIVA_MS = 30 * 60 * 1000;          // una sala sin mensajes en 30 min se cierra
const RATE = 90, RAFAGA = 180;               // mensajes por segundo permitidos por jugador (sostenido / ráfaga)

const nickLimpio = n => String(n ?? '').normalize('NFKC').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Jugador';
const ipDe = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();

export function montarSalas() {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
  const salas = new Map();                 // código -> sala
  const conxIp = new Map();                // ip -> nº de conexiones
  const creadas = new Map();               // ip -> [marcas de tiempo]
  const APP_ORIGINS = new Set(['https://localhost', 'capacitor://localhost']);

  const codigoNuevo = () => {
    for (let k = 0; k < 40; k++) {
      let c = ''; for (let i = 0; i < 4; i++) c += LETRAS[crypto.randomInt(LETRAS.length)];
      if (!salas.has(c)) return c;
    }
    return null;
  };
  const enviar = (ws, obj) => { if (ws.readyState === 1) { try { ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch {} } };
  const lista = s => ({ t: 'lista', code: s.code, host: s.host, fase: s.fase, modo: s.modo, jug: [...s.jug.values()].map(j => ({ id: j.id, n: j.nick })) });
  const difundir = (s, obj, salvo) => { const txt = JSON.stringify(obj); for (const j of s.jug.values()) if (j !== salvo) enviar(j.ws, txt); };
  function cerrarSala(s, motivo) {
    if (!salas.has(s.code)) return; salas.delete(s.code);
    for (const j of s.jug.values()) { j.sala = null; enviar(j.ws, { t: 'cierre', e: motivo || 'cerrada' }); }
    s.jug.clear();
  }
  function quitar(ws, motivo) {
    const s = ws.sala; if (!s) return; const yo = s.jug.get(ws.jid); ws.sala = null; ws.jid = 0;
    if (!yo) return; s.jug.delete(yo.id);
    if (yo.id === s.host) { cerrarSala(s, 'host'); return; }   // sin anfitrión no hay partida (v22: sin cambio de anfitrión)
    if (!s.jug.size) { salas.delete(s.code); return; }
    difundir(s, lista(s)); enviar(s.jug.get(s.host).ws, { t: 'sale', id: yo.id, e: motivo || 'salio' });
  }

  function mensaje(ws, m) {
    if (!m || typeof m !== 'object') return;
    const t = m.t, s = ws.sala;
    if (t === 'ping') return enviar(ws, { t: 'pong', c: Number(m.c) || 0, s: Date.now() });
    if (t === 'rl') {   // relé de juego: el invitado solo le habla al anfitrión; el anfitrión puede hablar a uno o a todos
      if (!s) return; s.act = Date.now(); const yo = s.jug.get(ws.jid); if (!yo || m.d === undefined) return;
      if (yo.id !== s.host) { const h = s.jug.get(s.host); if (h) enviar(h.ws, JSON.stringify({ t: 'rl', from: yo.id, d: m.d })); return; }
      const txt = JSON.stringify({ t: 'rl', from: yo.id, d: m.d });
      if (m.to === '*' || m.to === undefined) { for (const j of s.jug.values()) if (j !== yo) enviar(j.ws, txt); }
      else { const j = s.jug.get(Number(m.to)); if (j && j !== yo) enviar(j.ws, txt); }
      return;
    }
    if (t === 'crear') {
      if (s) quitar(ws);
      const ip = ws.ip, ahora = Date.now(), lst = (creadas.get(ip) || []).filter(x => ahora - x < 3600e3);
      if (lst.length >= CREAR_POR_HORA) return enviar(ws, { t: 'err', e: 'limite' });
      if (salas.size >= MAX_SALAS) return enviar(ws, { t: 'err', e: 'servidor_lleno' });
      const code = codigoNuevo(); if (!code) return enviar(ws, { t: 'err', e: 'servidor_lleno' });
      lst.push(ahora); creadas.set(ip, lst);
      const sala = { code, host: 1, fase: 'lobby', modo: 'coop', jug: new Map(), sig: 2, act: ahora, seed: 0 };
      const yo = { id: 1, nick: nickLimpio(m.nick), ws }; sala.jug.set(1, yo); salas.set(code, sala); ws.sala = sala; ws.jid = 1;
      return enviar(ws, { ...lista(sala), t: 'sala', yo: 1 });
    }
    if (t === 'unir') {
      if (s) quitar(ws);
      const code = String(m.code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4), sala = salas.get(code);
      if (!sala) return enviar(ws, { t: 'err', e: 'no_existe' });
      if (sala.fase !== 'lobby') return enviar(ws, { t: 'err', e: 'empezada' });
      if (sala.jug.size >= MAX_JUG) return enviar(ws, { t: 'err', e: 'llena' });
      const id = sala.sig++; const yo = { id, nick: nickLimpio(m.nick), ws };
      // dos jugadores con el mismo apodo: se distingue con un número
      const usados = new Set([...sala.jug.values()].map(j => j.nick)); if (usados.has(yo.nick)) { let k = 2; while (usados.has(yo.nick.slice(0, 13) + ' ' + k)) k++; yo.nick = yo.nick.slice(0, 13) + ' ' + k; }
      sala.jug.set(id, yo); sala.act = Date.now(); ws.sala = sala; ws.jid = id;
      enviar(ws, { ...lista(sala), t: 'sala', yo: id }); difundir(sala, lista(sala), yo);
      return;
    }
    if (!s) return;
    const yo = s.jug.get(ws.jid); if (!yo) return; s.act = Date.now();
    if (t === 'salir') return quitar(ws);
    if (t === 'modo' && yo.id === s.host && s.fase === 'lobby') {   // v24: el anfitrión elige en equipo o todos contra todos
      s.modo = m.m === 'pvp' ? 'pvp' : 'coop'; return difundir(s, lista(s));
    }
    if (t === 'empezar' && yo.id === s.host && s.fase === 'lobby') {
      s.fase = 'juego'; s.seed = crypto.randomInt(1, 2 ** 30);
      return difundir(s, { t: 'empezar', modo: s.modo, seed: s.seed, ids: [...s.jug.keys()], n: [...s.jug.values()].map(j => j.nick), at: Date.now() });
    }
    if (t === 'fin' && yo.id === s.host && s.fase === 'juego') { s.fase = 'lobby'; return difundir(s, lista(s)); }
  }

  wss.on('connection', (ws, req) => {
    ws.ip = ipDe(req); ws.isAlive = true; ws.sala = null; ws.jid = 0; ws.tok = RAFAGA; ws.tt = Date.now(); ws.mal = 0;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', () => {});
    ws.on('close', () => quitar(ws, 'desconectado'));
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      const ahora = Date.now(), dts = (ahora - ws.tt) / 1000; ws.tok = Math.min(RAFAGA, ws.tok + dts * RATE); ws.mal = Math.max(0, ws.mal - dts * 60); ws.tt = ahora;
      if (ws.tok < 1) { if (++ws.mal > 400) ws.terminate(); return; }   // exceso: se descarta; un abuso sostenido corta la conexión
      ws.tok -= 1;
      let m; try { m = JSON.parse(data.toString()); } catch { return; }
      try { mensaje(ws, m); } catch (e) { console.log('[salas] error', e?.message || e); }
    });
  });

  // latido (detecta teléfonos que desaparecen) y limpieza de salas olvidadas
  const reloj = setInterval(() => {
    for (const c of wss.clients) { if (!c.isAlive) { c.terminate(); continue; } c.isAlive = false; try { c.ping(); } catch {} }
    const ahora = Date.now();
    for (const s of [...salas.values()]) if (ahora - s.act > INACTIVA_MS) cerrarSala(s, 'inactiva');
    for (const [ip, l] of creadas) { const f = l.filter(x => ahora - x < 3600e3); if (f.length) creadas.set(ip, f); else creadas.delete(ip); }
  }, 20000);
  reloj.unref?.();

  return {
    wss,
    upgrade(req, socket, head) {
      // solo desde este mismo sitio o desde la app Android
      const o = req.headers.origin;
      if (o) { let h = ''; try { h = new URL(o).host; } catch {} if (h !== req.headers.host && !APP_ORIGINS.has(o)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; } }
      const ip = ipDe(req); if ((conxIp.get(ip) || 0) >= MAX_CONX_IP) { socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n'); socket.destroy(); return; }
      conxIp.set(ip, (conxIp.get(ip) || 0) + 1);
      socket.once('close', () => { const n = (conxIp.get(ip) || 1) - 1; if (n > 0) conxIp.set(ip, n); else conxIp.delete(ip); });   // también si el saludo falla
      wss.handleUpgrade(req, socket, head, ws => { wss.emit('connection', ws, req); });
    },
    estado() { let j = 0; for (const s of salas.values()) j += s.jug.size; return { salas: salas.size, jugadores: j }; },
    cerrar() { clearInterval(reloj); for (const s of [...salas.values()]) cerrarSala(s, 'apagado'); for (const c of wss.clients) c.terminate(); }
  };
}
