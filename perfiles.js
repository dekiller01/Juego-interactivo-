// Neon Beat Rush · perfiles, partidas, ranking y panel de análisis.
//
// Identidad: apodo + token secreto guardado en el teléfono + código de recuperación (sin correo, sin contraseña).
// Datos: PostgreSQL si existe DATABASE_URL (Neon, Supabase...); si no, un archivo temporal (se borra al reiniciar en Render).
// Todo el estado vive en memoria (rápido y sencillo); la base de datos se escribe ANTES de responder "ok",
// así que si la base falla el juego recibe un error y reintenta más tarde.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const DAY = 864e5;
const VENTANA = 30 * DAY;      // partidas completas en memoria y en el panel
const PURGA = 180 * DAY;       // las partidas más viejas se borran de la base (los récords y totales se quedan)
const MAX_SESIONES = 5;        // teléfonos/navegadores con sesión abierta por jugador
const ARMAS = ['PISTOLA', 'UMP', 'ESCOPETA', 'SNIPER', 'MINIGUN'];

/* ---------- utilidades ---------- */
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const ALFA_ID = 'abcdefghjkmnpqrstuvwxyz23456789';
const ALFA_COD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';           // sin I, L, O, 0, 1
const azar = (n, a) => Array.from({ length: n }, () => a[crypto.randomInt(a.length)]).join('');
const normCod = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const fmtCod = c => c.match(/.{4}/g).join('-');
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (x, lo, hi, d = 0) => { x = Number(x); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
const ent = (x, lo, hi, d = 0) => Math.round(num(x, lo, hi, d));
const r1 = x => Math.round(x * 10) / 10;
const pct = (a, b) => (b > 0 ? Math.round(100 * a / b) : 0);

/* ---------- límites de uso (en memoria) ---------- */
const registro = [];
const contador = ms => {
  const m = new Map(); registro.push({ m, ms });
  return {
    n: k => { const a = m.get(k); return a && Date.now() - a.t <= ms ? a.n : 0; },
    mas: k => { const t = Date.now(); let a = m.get(k); if (!a || t - a.t > ms) { a = { t, n: 0 }; m.set(k, a); } return ++a.n; },
  };
};
const limitador = (max, ms) => { const c = contador(ms); return k => c.mas(k) <= max; };
setInterval(() => { const t = Date.now(); for (const { m, ms } of registro) for (const [k, a] of m) if (t - a.t > ms) m.delete(k); }, 60000).unref();

/* ---------- apodos ---------- */
const LET = 'A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ';
const NICK_RE = new RegExp(`^[${LET}][${LET} _.\\-]{1,14}[${LET}]$`);
const limpiarNick = n => String(n ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const claveNick = n => sinTildes(n).replace(/[\s_.\-]+/g, '');
// Filtro mínimo: palabras sueltas y trozos muy poco probables en un apodo normal. El panel permite ocultar a quien se cuele.
const PALABRAS = new Set(['admin', 'administrador', 'moderador', 'mod', 'sistema', 'system', 'staff', 'soporte', 'oficial',
  'puta', 'puto', 'putas', 'putos', 'verga', 'pene', 'culo', 'zorra', 'perra', 'pendejo', 'pendeja', 'marica', 'maricon', 'cabron', 'cabrona', 'culero', 'chingar', 'joder', 'coño', 'cono',
  'nazi', 'sexo', 'porno', 'porn', 'fuck', 'shit', 'bitch', 'dick', 'cock', 'pussy', 'rape', 'nigga', 'nigger']);
const TROZOS = ['mierda', 'pendej', 'cabron', 'maricon', 'pedofil', 'violador', 'hitler', 'nigger', 'faggot', 'fuck', 'chingad', 'puta madre', 'putamadre'];
function errorNick(n) {
  if (!NICK_RE.test(n)) return 'El apodo debe tener de 3 a 16 caracteres: letras, números, espacio, punto, guion o guion bajo.';
  const k = claveNick(n); if (k.length < 3) return 'El apodo es demasiado corto.';
  const toks = sinTildes(n).split(/[^a-z0-9]+/).filter(Boolean);
  if (toks.some(t => PALABRAS.has(t)) || PALABRAS.has(k) || TROZOS.some(t => k.includes(t.replace(/ /g, '')))) return 'Ese apodo no está permitido.';
  return null;
}

/* ---------- validación de una partida enviada por el juego ---------- */
const texto = (x, n) => String(x ?? '').replace(/[^\w ().,:/+\-]/g, '').slice(0, n);
const claves = (o, re, max, hi) => { const r = {}; if (o && typeof o === 'object') for (const k of Object.keys(o).slice(0, max)) if (re.test(k)) r[k] = ent(o[k], 0, hi); return r; };
function validar(b) {
  if (!b || typeof b !== 'object') return { error: 'Datos no válidos.' };
  const mid = String(b.mid || ''); if (!/^[a-z0-9]{8,24}$/i.test(mid)) return { error: 'Identificador de partida no válido.' };
  const dur = r1(num(b.dur, 0, 36000)), kills = ent(b.kills, 0, 1e6), score = ent(b.score, 0, 2e9), level = ent(b.level, 1, 999);
  if (dur < 20 || kills < 1) return { skip: true };           // partidas de menos de 20 s o sin bajas no se guardan
  const w = Array.from({ length: 5 }, (_, i) => { const a = Array.isArray(b.w?.[i]) ? b.w[i] : []; return Array.from({ length: 9 }, (_, j) => r1(num(a[j], 0, 1e9))); });
  const f = b.fps || {}, d = b.dev || {};
  const data = {
    sv: 1, cv: ent(b.v, 0, 999), ch: texto(b.ch, 12).toLowerCase(), mc: ent(b.mc, 0, 1e5), w,
    kt: claves(b.kt, /^[a-z0-9_]{2,16}$/i, 30, 1e6), up: claves(b.up, /^[a-z0-9_]{1,16}$/i, 40, 500),
    lv: Array.isArray(b.lv) ? b.lv.slice(0, 300).map(x => ent(x, 0, 36000)) : [],
    hit: ent(b.hit, 0, 1e7), dist: ent(b.dist, 0, 1e7), dg: ent(b.dg, 0, 1e5), dgb: ent(b.dgb, 0, 1e5), pd: ent(b.pd, 0, 1e5),
    ab: ent(b.ab, 0, 1e5), ul: ent(b.ul, 0, 1e5), ev: ent(b.ev, 0, 1e6), fm: ent(b.fm, 0, 100),
    death: texto(b.death, 16).toLowerCase(),
    fps: { a: r1(num(f.a, 0, 300)), m: r1(num(f.m, 0, 300)), lo: ent(f.lo, 0, 36000), n: ent(f.n, 0, 36000), q: Math.round(num(f.q, 0, 5) * 100) / 100 },
    bpm: ent(b.bpm, 0, 400), map: b.map ? 1 : 0, qm: texto(b.qm, 10),
    dev: { app: d.app ? 1 : 0, touch: d.touch ? 1 : 0, dpr: r1(num(d.dpr, 0, 10)), scr: texto(d.scr, 12), cores: ent(d.cores, 0, 256), mem: num(d.mem, 0, 512), gpu: texto(d.gpu, 60) },
  };
  return { mid, score, kills, level, dur, data };
}
// El juego sube de nivel cada 20 bajas y el puntaje mínimo por baja es pequeño: lo que no cuadra no entra al ranking.
const sospechosa = m => m.kills > 6 + m.dur * 12 || m.score > 2000 + m.dur * 5000 || m.score < m.kills * 2
  || Math.abs(m.level - (1 + Math.floor(m.kills / 20))) > 1 || m.data.w.reduce((s, a) => s + a[6], 0) > m.kills + 2;

/* ---------- almacenamiento: PostgreSQL ---------- */
async function persistPg(url) {
  const { default: pg } = await import('pg');
  let cs = url, host = '';
  try { const u = new URL(url); host = u.hostname; u.searchParams.delete('sslmode'); u.searchParams.delete('ssl'); cs = u.toString(); } catch { /* se usa tal cual */ }
  const modo = (process.env.DATABASE_SSL || '').toLowerCase();
  const ssl = (['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) || modo === 'off') ? false : { rejectUnauthorized: modo === 'strict' };
  const pool = new pg.Pool({ connectionString: cs, ssl, max: 4, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000, keepAlive: true });
  pool.on('error', e => console.log('[db] conexión caída:', e.message));
  const q = async (t, p) => { try { return await pool.query(t, p); } catch (e) { if (/terminat|ECONN|timeout|closed|reset/i.test(e.message)) return await pool.query(t, p); throw e; } };
  const tx = async fn => { const c = await pool.connect(); try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; } catch (e) { try { await c.query('rollback'); } catch { /* nada */ } throw e; } finally { c.release(); } };
  const apodoEnUso = e => { if (e.code === '23505') { const x = new Error('apodo'); x.apodo = true; return x; } return e; };
  const esquema = `
    create table if not exists nbr_players(id text primary key, nick text not null, nick_key text not null unique, code_hash text not null,
      created_at timestamptz not null default now(), last_at timestamptz, hidden boolean not null default false, n int not null default 0,
      kills bigint not null default 0, best bigint not null default 0, best_lv int not null default 0, dur double precision not null default 0);
    create table if not exists nbr_sessions(hash text primary key, player_id text not null references nbr_players(id) on delete cascade, created_at timestamptz not null default now());
    create index if not exists nbr_sessions_p on nbr_sessions(player_id);
    create table if not exists nbr_matches(pk bigserial primary key, player_id text not null references nbr_players(id) on delete cascade, mid text not null,
      at timestamptz not null default now(), score bigint not null, kills int not null, level int not null, dur double precision not null,
      suspect boolean not null default false, data jsonb not null, unique(player_id, mid));
    create index if not exists nbr_matches_at on nbr_matches(at);`;
  return {
    tipo: 'PostgreSQL', persistente: true,
    async cerrar() { try { await pool.end(); } catch { /* nada */ } },
    async load() {
      await q(esquema);
      const players = (await q('select * from nbr_players')).rows.map(r => ({ id: r.id, nick: r.nick, nickKey: r.nick_key, codeHash: r.code_hash, createdAt: +new Date(r.created_at), lastAt: r.last_at ? +new Date(r.last_at) : 0, hidden: r.hidden, n: r.n, kills: Number(r.kills), best: Number(r.best), bestLv: r.best_lv, dur: r.dur }));
      const sessions = (await q('select hash, player_id from nbr_sessions order by created_at')).rows.map(r => ({ hash: r.hash, playerId: r.player_id }));
      const matches = (await q('select pk, player_id, mid, at, score, kills, level, dur, suspect, data from nbr_matches where at >= $1 order by at', [new Date(Date.now() - VENTANA)])).rows
        .map(r => ({ pk: Number(r.pk), playerId: r.player_id, mid: r.mid, at: +new Date(r.at), score: Number(r.score), kills: r.kills, level: r.level, dur: r.dur, suspect: r.suspect, data: r.data }));
      return { players, sessions, matches };
    },
    async crearJugador(p, hash) {
      try { await tx(async c => { await c.query('insert into nbr_players(id,nick,nick_key,code_hash,created_at) values($1,$2,$3,$4,$5)', [p.id, p.nick, p.nickKey, p.codeHash, new Date(p.createdAt)]); await c.query('insert into nbr_sessions(hash,player_id) values($1,$2)', [hash, p.id]); }); }
      catch (e) { throw apodoEnUso(e); }
    },
    async sesion(id, hash) {
      await tx(async c => {
        await c.query('insert into nbr_sessions(hash,player_id) values($1,$2)', [hash, id]);
        await c.query('delete from nbr_sessions where player_id=$1 and hash not in (select hash from nbr_sessions where player_id=$1 order by created_at desc limit $2)', [id, MAX_SESIONES]);
      });
    },
    async salir(hash) { await q('delete from nbr_sessions where hash=$1', [hash]); },
    async apodo(id, nick, key) { try { await q('update nbr_players set nick=$2, nick_key=$3 where id=$1', [id, nick, key]); } catch (e) { throw apodoEnUso(e); } },
    async codigo(id, h) { await q('update nbr_players set code_hash=$2 where id=$1', [id, h]); },
    async oculto(id, v) { await q('update nbr_players set hidden=$2 where id=$1', [id, v]); },
    async borrar(id) { await q('delete from nbr_players where id=$1', [id]); },
    async partida(m) {
      return await tx(async c => {
        const r = await c.query('insert into nbr_matches(player_id,mid,at,score,kills,level,dur,suspect,data) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (player_id,mid) do nothing returning pk',
          [m.playerId, m.mid, new Date(m.at), m.score, m.kills, m.level, m.dur, m.suspect, JSON.stringify(m.data)]);
        if (!r.rowCount) return null;                                   // ya estaba guardada
        if (m.suspect) await c.query('update nbr_players set last_at=$2 where id=$1', [m.playerId, new Date(m.at)]);
        else await c.query('update nbr_players set n=n+1, kills=kills+$2, best=greatest(best,$3), best_lv=greatest(best_lv,$4), dur=dur+$5, last_at=$6 where id=$1', [m.playerId, m.kills, m.score, m.level, m.dur, new Date(m.at)]);
        return { pk: Number(r.rows[0].pk) };
      });
    },
    async limpiar() { await q('delete from nbr_matches where at < $1', [new Date(Date.now() - PURGA)]); },
  };
}

/* ---------- almacenamiento: archivo (temporal en Render gratis) ---------- */
function persistArchivo() {
  const dir = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
  const file = path.join(dir, 'perfiles.json');
  let pk = 1, foto = null, t = null;
  const guardar = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try { fs.mkdirSync(dir, { recursive: true }); const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ ...foto(), pk })); fs.renameSync(tmp, file); }
      catch (e) { console.log('[perfiles] no se pudo guardar el archivo:', e.message); }
    }, 1500);
    t.unref?.();
  };
  const ok = async () => { guardar(); };
  return {
    tipo: 'archivo temporal', persistente: false,
    adjuntar(f) { foto = f; },
    async load() { try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); pk = j.pk || 1; return { players: j.players || [], sessions: j.sessions || [], matches: j.matches || [] }; } catch { return { players: [], sessions: [], matches: [] }; } },
    crearJugador: ok, sesion: ok, salir: ok, apodo: ok, codigo: ok, oculto: ok, borrar: ok, limpiar: ok,
    async partida() { guardar(); return { pk: pk++ }; },
  };
}

/* ---------- estado en memoria ---------- */
const E = { listo: false, error: '', persist: null, jug: new Map(), porClave: new Map(), porSesion: new Map(), partidas: [], mids: new Set(), cache: new Map(), desde: Date.now() };
const foto = () => ({
  players: [...E.jug.values()].map(({ ses, ...p }) => p),
  sessions: [...E.porSesion].map(([hash, playerId]) => ({ hash, playerId })),
  matches: E.partidas,
});
function cargar(st) {
  E.jug.clear(); E.porClave.clear(); E.porSesion.clear();
  for (const p of st.players) { p.ses = []; E.jug.set(p.id, p); E.porClave.set(p.nickKey, p.id); }
  for (const s of st.sessions) { const p = E.jug.get(s.playerId); if (p) { p.ses.push(s.hash); E.porSesion.set(s.hash, p.id); } }
  E.partidas = st.matches.filter(m => E.jug.has(m.playerId));
  E.mids = new Set(E.partidas.map(m => m.playerId + ':' + m.mid));
  E.cache.clear();
}
async function arrancar() {
  for (;;) {
    try {
      const url = process.env.DATABASE_URL;
      E.persist = url ? await persistPg(url) : persistArchivo();
      if (!url) console.log('[perfiles] DATABASE_URL no está definida: se usa un archivo temporal (se borra cuando Render reinicia).');
      E.persist.adjuntar?.(foto);
      cargar(await E.persist.load());
      E.listo = true; E.error = '';
      console.log(`[perfiles] listo (${E.persist.tipo}): ${E.jug.size} jugadores, ${E.partidas.length} partidas recientes`);
      return;
    } catch (e) {
      E.error = String(e.message || e).replace(/postgres(ql)?:\/\/\S+/gi, '[url]').slice(0, 300);
      console.log('[perfiles] error al iniciar:', E.error);
      try { await E.persist?.cerrar?.(); } catch { /* nada */ }
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}
function quitarJugador(id) {
  const p = E.jug.get(id); if (!p) return;
  for (const h of p.ses) E.porSesion.delete(h);
  E.jug.delete(id); if (E.porClave.get(p.nickKey) === id) E.porClave.delete(p.nickKey);
  E.partidas = E.partidas.filter(m => m.playerId !== id);
  for (const k of [...E.mids]) if (k.startsWith(id + ':')) E.mids.delete(k);
  E.cache.clear();
}
function abrirSesion(p, hash) {
  p.ses.push(hash); E.porSesion.set(hash, p.id);
  while (p.ses.length > MAX_SESIONES) E.porSesion.delete(p.ses.shift());
}
setInterval(() => {
  const lim = Date.now() - VENTANA;
  if (E.partidas.length && E.partidas[0].at < lim) { E.partidas = E.partidas.filter(m => m.at >= lim); E.mids = new Set(E.partidas.map(m => m.playerId + ':' + m.mid)); E.cache.clear(); }
  E.persist?.limpiar?.().catch(e => console.log('[perfiles] limpieza:', e.message));
}, 3600e3).unref();

/* ---------- ranking ---------- */
function tablaRank(por, per) {
  const k = por + per, c = E.cache.get(k);
  if (c && Date.now() - c.t < 20000) return c;
  const desde = per === 'day' ? Date.now() - DAY : per === 'week' ? Date.now() - 7 * DAY : 0;
  let filas = [];
  if (!desde) {
    for (const p of E.jug.values()) { if (p.hidden || !p.n) continue; const v = por === 'score' ? p.best : p.kills; if (v > 0) filas.push({ id: p.id, nick: p.nick, v, lv: p.bestLv }); }
  } else {
    const m = new Map();
    for (const x of E.partidas) {
      if (x.suspect || x.at < desde) continue;
      const p = E.jug.get(x.playerId); if (!p || p.hidden) continue;
      let a = m.get(p.id); if (!a) m.set(p.id, a = { id: p.id, nick: p.nick, v: 0, lv: 0 });
      a.lv = Math.max(a.lv, x.level); if (por === 'score') a.v = Math.max(a.v, x.score); else a.v += x.kills;
    }
    filas = [...m.values()].filter(a => a.v > 0);
  }
  filas.sort((a, b) => b.v - a.v || (a.nick < b.nick ? -1 : 1));
  const pos = new Map(); filas.forEach((f, i) => { f.r = i + 1; pos.set(f.id, f); });
  const o = { t: Date.now(), filas, pos }; E.cache.set(k, o); return o;
}
const rangoDe = p => {
  const rg = (por, per) => { const t = tablaRank(por, per), f = t.pos.get(p.id); return f ? { r: f.r, n: t.filas.length } : null; };
  return { score: { all: rg('score', 'all'), week: rg('score', 'week') }, kills: { all: rg('kills', 'all') } };
};

/* ---------- análisis de partidas ---------- */
function agregar(ms) {
  const o = { n: ms.length, dur: 0, kills: 0, score: 0, hit: 0, dist: 0, mc: 0, lvSum: 0, sh: 0, bs: 0, mapa: 0, vivo: 0, dg: 0, dgb: 0, pd: 0, ev: 0,
    w: ARMAS.map(() => ({ t: 0, sh: 0, sk: 0, im: 0, dmg: 0, dist: 0, k: 0, cr: 0, bt: 0 })), muertes: {}, kt: {}, up: {}, lvN: {}, lvT: {}, chars: {}, gpu: {},
    fps: { s: 0, n: 0, lo: 0, q: 0 }, sMapa: 0, sVivo: 0 };
  for (const m of ms) {
    const d = m.data; o.dur += m.dur; o.kills += m.kills; o.score += m.score; o.hit += d.hit; o.dist += d.dist; o.mc = Math.max(o.mc, d.mc); o.lvSum += m.level;
    o.dg += d.dg; o.dgb += d.dgb; o.pd += d.pd; o.ev += d.ev;
    d.w.forEach((a, i) => { const x = o.w[i]; x.t += a[0]; x.sh += a[1]; x.sk += a[2]; x.im += a[3]; x.dmg += a[4]; x.dist += a[5]; x.k += a[6]; x.cr += a[7]; x.bt += a[8]; o.sh += a[1]; o.bs += a[8]; });
    const mu = d.death || '?'; o.muertes[mu] = (o.muertes[mu] || 0) + 1;
    for (const k in d.kt) o.kt[k] = (o.kt[k] || 0) + d.kt[k];
    for (const k in d.up) o.up[k] = (o.up[k] || 0) + d.up[k];
    o.lvN[m.level] = (o.lvN[m.level] || 0) + 1;
    d.lv.forEach((s, i) => { const t = o.lvT[i + 1] || (o.lvT[i + 1] = { s: 0, n: 0 }); t.s += s - (i ? d.lv[i - 1] : 0); t.n++; });
    const c = o.chars[d.ch || '?'] || (o.chars[d.ch || '?'] = { n: 0, score: 0, dur: 0 }); c.n++; c.score += m.score; c.dur += m.dur;
    if (d.map) { o.mapa++; o.sMapa += m.score; } else { o.vivo++; o.sVivo += m.score; }
    if (d.fps.n) {
      o.fps.s += d.fps.a * d.fps.n; o.fps.n += d.fps.n; o.fps.lo += d.fps.lo; o.fps.q += d.fps.q * d.fps.n;
      const gk = (d.dev.gpu || 'desconocida') + (d.dev.app ? ' · app' : ''), g = o.gpu[gk] || (o.gpu[gk] = { n: 0, s: 0, ms: 0, lo: 0, q: 0, sec: 0 });
      g.n++; g.s += d.fps.a * d.fps.n; g.ms += d.fps.m; g.lo += d.fps.lo; g.q += d.fps.q * d.fps.n; g.sec += d.fps.n;
    }
  }
  return o;
}
function resumenPersonal(p) {
  const ms = E.partidas.filter(m => m.playerId === p.id && !m.suspect), o = agregar(ms);
  if (!o.n) return { n30: 0 };
  let fav = 0; o.w.forEach((x, i) => { if (x.t > o.w[fav].t) fav = i; });
  const tt = o.w.reduce((s, x) => s + x.t, 0), im = o.w.reduce((s, x) => s + x.im, 0), dmg = o.w.reduce((s, x) => s + x.dmg, 0), dist = o.w.reduce((s, x) => s + x.dist, 0), sk = o.w.reduce((s, x) => s + x.sk, 0);
  const muerte = Object.entries(o.muertes).sort((a, b) => b[1] - a[1])[0];
  return { n30: o.n, arma: ARMAS[fav], armaPct: pct(o.w[fav].t, tt), precision: pct(sk, o.sh), ritmo: pct(o.bs, o.sh), dmgImpacto: im ? r1(dmg / im) : 0, distImpacto: im ? r1(dist / im) : 0,
    nivelMedio: r1(o.lvSum / o.n), muerte: muerte ? muerte[0] : '', fps: o.fps.n ? r1(o.fps.s / o.fps.n) : 0, metros: o.dist };
}
const publico = p => ({ id: p.id, nick: p.nick });
const statsDe = p => ({ n: p.n, kills: p.kills, best: p.best, bestLv: p.bestLv, dur: Math.round(p.dur) });

/* ---------- rutas del juego ---------- */
export function montarPerfiles(app, { keyOk }) {
  app.set('trust proxy', 1);
  const r = express.Router();
  const gen = limitador(240, 60000), reg = limitador(Number(process.env.NBR_MAX_REG) || 6, 3600e3), rec = limitador(12, 3600e3), fallos = contador(600e3), partida = limitador(8, 60000), apod = limitador(4, 86400e3);
  const bad = (res, code, error) => res.status(code).json({ ok: false, error });

  r.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!gen(req.ip)) return bad(res, 429, 'Demasiadas peticiones, espera un momento.');
    if (!E.listo) return bad(res, 503, 'El servidor está iniciando, reintenta en unos segundos.');
    next();
  });
  const token = req => { const h = String(req.headers.authorization || ''); return (h.startsWith('Bearer ') ? h.slice(7) : String(req.body?.token || '')).slice(0, 100); };
  const quien = req => { const id = E.porSesion.get(sha(token(req))); return id ? E.jug.get(id) : null; };
  const auth = (req, res, next) => { const p = quien(req); if (!p) return bad(res, 401, 'Sesión no válida: vuelve a entrar con tu código.'); req.p = p; next(); };

  r.post('/registro', async (req, res) => {
    if (!reg(req.ip)) return bad(res, 429, 'Demasiados perfiles creados desde esta conexión. Inténtalo más tarde.');
    const nick = limpiarNick(req.body?.nick), err = errorNick(nick); if (err) return bad(res, 400, err);
    const key = claveNick(nick); if (E.porClave.has(key)) return bad(res, 409, 'Ese apodo ya está en uso.');
    E.porClave.set(key, 'reservado');
    let id; do { id = azar(8, ALFA_ID); } while (E.jug.has(id));
    const tk = crypto.randomBytes(32).toString('base64url'), cod = azar(12, ALFA_COD);
    const p = { id, nick, nickKey: key, codeHash: sha(cod), createdAt: Date.now(), lastAt: 0, hidden: false, n: 0, kills: 0, best: 0, bestLv: 0, dur: 0, ses: [] };
    try { await E.persist.crearJugador(p, sha(tk)); }
    catch (e) { E.porClave.delete(key); return e.apodo ? bad(res, 409, 'Ese apodo ya está en uso.') : (console.log('[perfiles] registro:', e.message), bad(res, 503, 'No se pudo guardar el perfil, inténtalo de nuevo.')); }
    E.jug.set(id, p); E.porClave.set(key, id); abrirSesion(p, sha(tk)); E.cache.clear();
    res.json({ ok: true, id, nick, token: tk, code: fmtCod(cod) });
  });

  r.post('/recuperar', async (req, res) => {
    if (!rec(req.ip)) return bad(res, 429, 'Demasiados intentos. Espera un rato.');
    const nick = limpiarNick(req.body?.nick), key = claveNick(nick);
    if (fallos.n(key) >= 5) return bad(res, 429, 'Demasiados intentos con ese apodo. Espera 10 minutos.');
    const p = E.jug.get(E.porClave.get(key)), cod = normCod(req.body?.code);
    if (!p || cod.length !== 12 || !igual(sha(cod), p.codeHash)) { fallos.mas(key); return bad(res, 403, 'Apodo o código incorrecto.'); }
    const tk = crypto.randomBytes(32).toString('base64url');
    try { await E.persist.sesion(p.id, sha(tk)); } catch (e) { console.log('[perfiles] recuperar:', e.message); return bad(res, 503, 'No se pudo abrir la sesión, inténtalo de nuevo.'); }
    abrirSesion(p, sha(tk));
    res.json({ ok: true, id: p.id, nick: p.nick, token: tk });
  });

  r.get('/yo', auth, (req, res) => res.json({ ok: true, ...publico(req.p), stats: statsDe(req.p), an: resumenPersonal(req.p), rank: rangoDe(req.p), oculto: req.p.hidden }));

  r.post('/apodo', auth, async (req, res) => {
    if (!apod(req.p.id)) return bad(res, 429, 'Solo puedes cambiar el apodo 4 veces al día.');
    const nick = limpiarNick(req.body?.nick), err = errorNick(nick); if (err) return bad(res, 400, err);
    const key = claveNick(nick), dueño = E.porClave.get(key); if (dueño && dueño !== req.p.id) return bad(res, 409, 'Ese apodo ya está en uso.');
    try { await E.persist.apodo(req.p.id, nick, key); } catch (e) { return e.apodo ? bad(res, 409, 'Ese apodo ya está en uso.') : bad(res, 503, 'No se pudo guardar, inténtalo de nuevo.'); }
    if (E.porClave.get(req.p.nickKey) === req.p.id) E.porClave.delete(req.p.nickKey);
    req.p.nick = nick; req.p.nickKey = key; E.porClave.set(key, req.p.id); E.cache.clear();
    res.json({ ok: true, nick });
  });

  r.post('/codigo', auth, async (req, res) => {
    const cod = azar(12, ALFA_COD);
    try { await E.persist.codigo(req.p.id, sha(cod)); } catch (e) { return bad(res, 503, 'No se pudo guardar, inténtalo de nuevo.'); }
    req.p.codeHash = sha(cod); res.json({ ok: true, code: fmtCod(cod) });
  });

  r.post('/salir', auth, async (req, res) => {
    const h = sha(token(req));
    try { await E.persist.salir(h); } catch (e) { return bad(res, 503, 'No se pudo cerrar la sesión, inténtalo de nuevo.'); }
    E.porSesion.delete(h); req.p.ses = req.p.ses.filter(x => x !== h); res.json({ ok: true });
  });

  r.post('/borrar', auth, async (req, res) => {
    try { await E.persist.borrar(req.p.id); } catch (e) { return bad(res, 503, 'No se pudo borrar, inténtalo de nuevo.'); }
    quitarJugador(req.p.id); res.json({ ok: true });
  });

  r.post('/partida', auth, async (req, res) => {
    const p = req.p;
    if (!partida(p.id)) return bad(res, 429, 'Demasiadas partidas seguidas.');
    const v = validar(req.body); if (v.error) return bad(res, 400, v.error);
    if (v.skip) return res.json({ ok: true, omitida: true });
    if (E.mids.has(p.id + ':' + v.mid)) return res.json({ ok: true, repetida: true, rank: rangoDe(p) });
    const m = { playerId: p.id, mid: v.mid, at: Date.now(), score: v.score, kills: v.kills, level: v.level, dur: v.dur, suspect: false, data: v.data };
    m.suspect = sospechosa(m);
    E.mids.add(p.id + ':' + v.mid);
    let g; try { g = await E.persist.partida(m); } catch (e) { E.mids.delete(p.id + ':' + v.mid); console.log('[perfiles] partida:', e.message); return bad(res, 503, 'No se pudo guardar la partida, se reintentará.'); }
    if (!g) return res.json({ ok: true, repetida: true, rank: rangoDe(p) });
    m.pk = g.pk; E.partidas.push(m);
    const record = !m.suspect && v.score > p.best;
    if (!m.suspect) { p.n++; p.kills += v.kills; p.best = Math.max(p.best, v.score); p.bestLv = Math.max(p.bestLv, v.level); p.dur += v.dur; }
    p.lastAt = m.at; E.cache.clear();
    res.json({ ok: true, record, noCuenta: m.suspect, rank: rangoDe(p), stats: statsDe(p) });
  });

  r.get('/ranking', (req, res) => {
    const por = req.query.por === 'kills' ? 'kills' : 'score', per = ['day', 'week'].includes(req.query.per) ? req.query.per : 'all', n = ent(req.query.n, 1, 50, 20);
    const t = tablaRank(por, per), yo = quien(req), f = yo && t.pos.get(yo.id);
    res.json({ ok: true, por, per, total: t.filas.length, rows: t.filas.slice(0, n).map(x => ({ r: x.r, nick: x.nick, v: x.v, lv: x.lv })), me: f ? { r: f.r, nick: f.nick, v: f.v, lv: f.lv } : null });
  });
  app.use('/api/p', r);

  /* ---------- panel del dueño ---------- */
  const a = express.Router(), fallosAdmin = contador(600e3);
  a.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (fallosAdmin.n(req.ip) >= 10) return res.status(429).type('text').send('Demasiados intentos. Espera 10 minutos.');
    const k = req.query.key ?? req.headers['x-admin-key'] ?? req.body?.key;
    if (!keyOk(typeof k === 'string' ? k : '')) { fallosAdmin.mas(req.ip); return res.status(401).type('text').send('Clave incorrecta'); }
    req.clave = k; next();
  });
  a.get('/panel', (req, res) => res.type('html').send(panel(req.clave, ent(req.query.dias, 1, 30, 30))));
  a.get('/export', (req, res) => {
    const desde = Date.now() - ent(req.query.dias, 1, 30, 30) * DAY;
    const filas = E.partidas.filter(m => m.at >= desde).map(m => ({ nick: E.jug.get(m.playerId)?.nick, id: m.playerId, en: new Date(m.at).toISOString(), score: m.score, kills: m.kills, level: m.level, dur: m.dur, suspect: m.suspect, ...m.data }));
    res.set('Content-Disposition', 'attachment; filename="partidas.json"').json(filas);
  });
  a.post('/accion', async (req, res) => {
    const id = String(req.body?.id || ''), acc = String(req.body?.accion || ''), p = E.jug.get(id);
    if (!p) return res.status(404).json({ ok: false, error: 'No existe' });
    try {
      if (acc === 'ocultar' || acc === 'mostrar') { await E.persist.oculto(id, acc === 'ocultar'); p.hidden = acc === 'ocultar'; E.cache.clear(); }
      else if (acc === 'borrar') { await E.persist.borrar(id); quitarJugador(id); }
      else return res.status(400).json({ ok: false, error: 'Acción desconocida' });
    } catch (e) { return res.status(503).json({ ok: false, error: e.message }); }
    res.json({ ok: true });
  });
  app.use('/admin', a);

  // errores de lectura del cuerpo (JSON roto o demasiado grande) → respuesta JSON limpia
  app.use('/api', (err, _req, res, next) => { if (res.headersSent) return next(err); res.status(err.status === 413 ? 413 : 400).json({ ok: false, error: 'Datos no válidos.' }); });

  arrancar();
}
export const perfilesListos = () => E.listo;

/* ---------- panel: página HTML ---------- */
function panel(clave, dias) {
  const ahora = Date.now(), desde = ahora - dias * DAY;
  const ms = E.partidas.filter(m => m.at >= desde && !m.suspect), sus = E.partidas.filter(m => m.at >= desde && m.suspect).length;
  const o = agregar(ms), hoy = E.partidas.filter(m => m.at >= ahora - DAY).length, sem = E.partidas.filter(m => m.at >= ahora - 7 * DAY).length;
  const mx = (obj, f = x => x) => Math.max(1, ...Object.values(obj).map(f));
  const bar = (v, max, c = '') => `<span class="b"><i class="${c}" style="width:${Math.min(100, Math.round(100 * v / (max || 1)))}%"></i></span>`;
  const tabla = (cab, filas) => `<div class="t"><table><tr>${cab.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
  const top = (obj, n = 12) => Object.entries(obj).sort((x, y) => y[1] - x[1]).slice(0, n);
  const prom = (s, n, d = 1) => (n ? (s / n).toFixed(d) : '–');
  const fmt = n => Math.round(n).toLocaleString('es');
  const gpuCorta = k => esc(String(k).replace(/^ANGLE \((.*)\)( · app)?$/, (_m, a, b) => a.replace(/,?\s*OpenGL ES[^,)]*$/, '').replace(/,?\s*Vulkan[^,)]*$/, '') + (b || '')));
  const hh = s => { s = Math.round(s); return s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.floor(s % 3600 / 60) + ' min' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s'; };
  let h = '';

  h += `<section><h2>Estado</h2>` + tabla(['Dato', 'Valor'], [
    ['Almacenamiento', E.persist ? (E.persist.persistente ? `<b class="ok">${esc(E.persist.tipo)} ✔ permanente</b>` : `<b class="mal">${esc(E.persist.tipo)} ⚠ se borra cuando Render reinicia. Pon DATABASE_URL.</b>`) : '<b class="mal">sin iniciar</b>'],
    ...(E.error ? [['Último error', `<b class="mal">${esc(E.error)}</b>`]] : []),
    ['Jugadores con perfil', fmt(E.jug.size)], ['Partidas hoy / 7 días / ' + dias + ' días', `${hoy} / ${sem} / ${E.partidas.filter(m => m.at >= desde).length}`],
    ['Partidas que no cuentan para el ranking (puntaje inusual)', sus], ['Duración media de partida', hh(o.n ? o.dur / o.n : 0)], ['Bajas totales (' + dias + ' d)', fmt(o.kills)],
    ['Servidor encendido desde hace', hh((ahora - E.desde) / 1000)]]) + `</section>`;

  const gp = Object.entries(o.gpu).sort((x, y) => y[1].n - x[1].n).slice(0, 15);
  h += `<section><h2>Rendimiento por dispositivo</h2><p class="n">FPS medio, segundos por debajo de 30 FPS y nivel de calidad medio (1 = el más alto). Si un dispositivo pasa del 15 % bajo 30 FPS, hay que bajarle la carga.</p>` +
    tabla(['Gráfica / dispositivo', 'Partidas', 'FPS medio', 'FPS mín. medio', '% bajo 30', 'Calidad'], gp.map(([k, g]) => {
      const lo = pct(g.lo, g.sec); return [gpuCorta(k), g.n, prom(g.s, g.sec), prom(g.ms, g.n), `<b class="${lo > 15 ? 'mal' : lo > 5 ? 'med' : 'ok'}">${lo} %</b>`, prom(g.q, g.sec, 2)];
    })) + (o.fps.n ? `<p class="n">Global: ${prom(o.fps.s, o.fps.n)} FPS medio · ${pct(o.fps.lo, o.fps.n)} % del tiempo bajo 30 FPS.</p>` : '<p class="n">Aún no hay datos.</p>') + `</section>`;

  const maxT = mx(Object.fromEntries(o.w.map((x, i) => [i, x.t])));
  h += `<section><h2>Armas</h2>` + tabla(['Arma', 'Uso', 'Disp.', 'Prec.', 'Ritmo', 'Daño', 'Crít.', 'Dist.', 'Bajas'],
    o.w.map((x, i) => [ARMAS[i], bar(x.t, maxT) + '<br><span class="nw">' + hh(x.t) + '</span>', fmt(x.sh), pct(x.sk, x.sh) + '\u00a0%', pct(x.bt, x.sh) + '\u00a0%', prom(x.dmg, x.im), pct(x.cr, x.im) + '\u00a0%', prom(x.dist, x.im) + '\u00a0m', fmt(x.k)])) +
    `<p class="n">Disp. = disparos. Prec. = % de disparos que dieron en un enemigo. Ritmo = % de disparos dados al compás. Daño = daño medio por impacto. Crít. = % de impactos críticos. Dist. = distancia media del impacto. Sin contar explosiones ni habilidades.</p></section>`;

  const niv = Object.entries(o.lvN).sort((x, y) => x[0] - y[0]), maxN = mx(o.lvN);
  h += `<section><h2>Niveles</h2><p class="n">Nivel medio al terminar: <b>${prom(o.lvSum, o.n)}</b> · récord de combo: <b>${o.mc}</b> · metros recorridos por partida: <b>${prom(o.dist, o.n, 0)}</b> · daño recibido por partida: <b>${prom(o.hit, o.n, 0)}</b></p>` +
    tabla(['Nivel alcanzado', 'Partidas'], niv.map(([l, n]) => [l, bar(n, maxN) + ' ' + n])) +
    tabla(['Nivel superado', 'Tiempo medio en ese nivel', 'Partidas'], Object.entries(o.lvT).sort((x, y) => x[0] - y[0]).slice(0, 30).map(([l, t]) => [l, prom(t.s, t.n, 0) + ' s', t.n])) + `</section>`;

  const mk = mx(o.kt);
  h += `<section><h2>Bajas por tipo de enemigo</h2>` + tabla(['Enemigo', 'Bajas'], top(o.kt, 20).map(([k, n]) => [esc(k), bar(n, mk) + ' ' + fmt(n)])) + `</section>`;
  const mm = mx(o.muertes);
  h += `<section><h2>Cómo terminan las partidas</h2><p class="n">«salio» = el jugador salió al menú. Lo demás es el último enemigo o fuente que hizo daño.</p>` + tabla(['Causa', 'Partidas'], top(o.muertes, 15).map(([k, n]) => [esc(k), bar(n, mm, 'r') + ' ' + n])) + `</section>`;

  h += `<section><h2>Ritmo y esquiva</h2>` + tabla(['Dato', 'Valor'], [
    ['Disparos al ritmo', pct(o.bs, o.sh) + ' %'], ['Partidas con mapa de ritmo / detección en vivo', `${o.mapa} / ${o.vivo}`],
    ['Puntaje medio con mapa / en vivo', `${prom(o.sMapa, o.mapa, 0)} / ${prom(o.sVivo, o.vivo, 0)}`], ['Esquivas por partida (al ritmo)', `${prom(o.dg, o.n)} (${pct(o.dgb, o.dg)} %)`],
    ['Esquivas perfectas por partida', prom(o.pd, o.n)], ['Eventos de TikTok por partida', prom(o.ev, o.n)]]) + `</section>`;

  const mu = mx(o.up);
  h += `<section><h2>Mejoras elegidas</h2>` + tabla(['Mejora', 'Veces'], top(o.up, 25).map(([k, n]) => [esc(k), bar(n, mu) + ' ' + n])) + `</section>`;
  h += `<section><h2>Personajes</h2>` + tabla(['Personaje', 'Partidas', 'Puntaje medio', 'Duración media'], Object.entries(o.chars).sort((x, y) => y[1].n - x[1].n).map(([k, c]) => [esc(k), c.n, fmt(c.score / c.n), hh(c.dur / c.n)])) + `</section>`;

  const js = [...E.jug.values()].sort((x, y) => (y.lastAt || 0) - (x.lastAt || 0)).slice(0, 60);
  h += `<section><h2>Jugadores (últimos 60 activos)</h2>` + tabla(['Apodo', 'Partidas', 'Mejor puntaje', 'Bajas', 'Última vez', ''], js.map(p => [
    esc(p.nick) + (p.hidden ? ' <i class="mal">(oculto)</i>' : ''), p.n, fmt(p.best), fmt(p.kills), p.lastAt ? new Date(p.lastAt).toLocaleString('es', { timeZone: 'America/Managua' }) : '–',
    `<button data-id="${esc(p.id)}" data-a="${p.hidden ? 'mostrar' : 'ocultar'}">${p.hidden ? 'Mostrar' : 'Ocultar'}</button> <button class="x" data-id="${esc(p.id)}" data-a="borrar" data-n="${esc(p.nick)}">Borrar</button>`])) + `</section>`;

  const k = encodeURIComponent(clave);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Panel · Neon Beat Rush</title><style>
:root{color-scheme:dark}body{margin:0;background:#0b0716;color:#eee;font:14px/1.45 system-ui,sans-serif;padding:12px 12px 60px;max-width:960px;margin:auto}
h1{font-size:20px;margin:6px 0 2px;color:#19f0ff}h2{font-size:15px;margin:22px 0 6px;color:#ff2fd0;letter-spacing:.06em;text-transform:uppercase}
.t{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:4px 0}th,td{padding:5px 8px;border-bottom:1px solid #fff2;text-align:left;vertical-align:top}td:first-child{min-width:70px}th{color:#9aa;font-weight:600;font-size:12px}
.b{display:inline-block;width:90px;height:8px;background:#fff1;border-radius:4px;vertical-align:middle;overflow:hidden}.b i{display:block;height:100%;background:#19f0ff}.b i.r{background:#ff3b5c}
.ok{color:#5dff9b}.med{color:#ffd23f}.mal{color:#ff6b81}.n{color:#9aa;font-size:12px;margin:4px 0}a{color:#19f0ff}button{background:#1b1233;color:#fff;border:1px solid #fff4;border-radius:4px;padding:5px 9px;font-size:12px}button.x{color:#ff6b81}
nav{margin:6px 0 10px}.nw{white-space:nowrap}@media (max-width:560px){body{padding:10px 8px 60px}th,td{padding:4px 4px;font-size:12px}th{font-size:11px}.b{width:36px}h2{font-size:14px}}</style></head><body><h1>Neon Beat Rush · panel</h1>
<nav>Periodo: ${[1, 7, 30].map(d => `<a href="?key=${k}&dias=${d}">${d} d</a>`).join(' · ')} · <a href="export?key=${k}&dias=${dias}">Descargar partidas (JSON)</a> · <a href="?key=${k}&dias=${dias}">Actualizar</a></nav>${h}
<script>const K=${JSON.stringify(clave).replace(/</g, '\\u003c')};document.addEventListener('click',async e=>{const b=e.target.closest('button[data-id]');if(!b)return;
if(b.dataset.a==='borrar'&&!confirm('¿Borrar para siempre a '+b.dataset.n+' y todas sus partidas?'))return;
const r=await fetch('accion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:K,id:b.dataset.id,accion:b.dataset.a})});const j=await r.json().catch(()=>({}));if(j.ok)location.reload();else alert(j.error||'Error');});</script></body></html>`;
}
