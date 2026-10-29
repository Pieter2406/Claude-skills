// The Worker answers /api/* only; every other path is served straight from public/ (see cloudflare.config.ts).
// Keep it small: validate input, cap sizes, and never trust the client.
#if room
import { DurableObject } from 'cloudflare:workers';
#endif

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') return json({ ok: true });
#if d1
      if (url.pathname === '/api/items') return items(request, env);
#endif
#if room
      if (url.pathname === '/api/rooms' && request.method === 'POST') return createRoom(env);
      // /api/room/<CODE>: one WebSocket per device, one Durable Object per room code.
      const m = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{4,12})$/);
      if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase())).fetch(new Request(`https://room/ws${url.search}`, request));
#endif
      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'server error' }, 500);
    }
  },
};
#if d1

// ---------- D1: a shared list. The table is created on first use, so there is no migration step to forget.
let ready = null;
function schema(env) {
  ready ??= env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, created_at INTEGER NOT NULL)',
  ).run().catch((err) => { ready = null; throw err; });
  return ready;
}

async function items(request, env) {
  await schema(env);
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, text, created_at FROM items ORDER BY id DESC LIMIT 200').all();
    return json(results);
  }
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const text = String(body.text ?? '').trim().slice(0, 500);
    if (!text) return json({ error: 'text is required' }, 400);
    const row = await env.DB.prepare('INSERT INTO items (text, created_at) VALUES (?, ?) RETURNING id, text, created_at').bind(text, Date.now()).first();
    return json(row, 201);
  }
  return json({ error: 'method not allowed' }, 405);
}
#endif
#if room

// ---------- Durable Object: a live room where the server is in charge.
// Devices send *actions*; the room checks who sent each one, updates its state, and sends every device its own *view*
// (the host can see what players can't, like the right answer). Nobody can overwrite the state or someone else's score.
// The example game is a buzzer: the host opens a round, the first player to buzz wins it. Replace view() and apply()
// (and the round fields) with the app's own rules; keep the identity, reconnect and alarm plumbing.
const ROOM_TTL = 24 * 3600e3; // a room is deleted a day after its last action
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1: easy to read aloud
const token = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => CHARS[b % CHARS.length]).join('');

/** POST /api/rooms: makes a fresh room and returns its code and the host key (kept by the host device only). */
async function createRoom(env) {
  for (let i = 0; i < 5; i++) {
    const code = token(4);
    const res = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/create', { method: 'POST' });
    if (res.ok) return json({ code, ...(await res.json()) }, 201);
  }
  return json({ error: 'try again' }, 503);
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Keep-alive pings are answered without waking the room.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/create') {
      if (await this.ctx.storage.get('state')) return json({ error: 'taken' }, 409);
      const state = { hostKey: token(), players: {}, round: null, lastActive: Date.now() };
      await this.save(state);
      return json({ hostKey: state.hostKey });
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    const state = await this.ctx.storage.get('state');
    if (!state) {
      // A typo'd or expired code: say so instead of quietly opening an empty room.
      server.accept();
      server.send(JSON.stringify({ type: 'error', error: 'no-room' }));
      server.close(4404, 'no such room');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server);
    // Who is this? The host proves it with the host key, a player with the id it got when it joined.
    const key = url.searchParams.get('key');
    const id = url.searchParams.get('player');
    const who = key && key === state.hostKey ? { role: 'host' } : { role: 'player', id: id && state.players[id] ? id : null };
    server.serializeAttachment(who);
    server.send(JSON.stringify({ type: 'view', view: this.view(state, who) }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 16_000) return;
    let action;
    try { action = JSON.parse(raw); } catch { return; }
    const state = await this.ctx.storage.get('state');
    if (!state) return;
    const who = ws.deserializeAttachment();
    const error = this.apply(state, who, action, ws);
    if (error) return ws.send(JSON.stringify({ type: 'error', error }));
    state.lastActive = Date.now();
    await this.save(state);
    this.broadcast(state);
  }

  /** The rules: returns an error string, or changes `state` in place. `who` is { role, id }. */
  apply(state, who, action, ws) {
    const now = Date.now();
    if (action.type === 'join') {
      if (who.role !== 'player' || who.id) return 'already joined';
      const name = String(action.name ?? '').trim().slice(0, 24);
      if (!name) return 'name required';
      if (Object.values(state.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return 'name taken';
      const id = token();
      state.players[id] = { name, score: 0 };
      who.id = id;
      ws.serializeAttachment(who);
      ws.send(JSON.stringify({ type: 'joined', player: id })); // the device stores this to come back as itself
      return null;
    }
    if (action.type === 'start') {
      if (who.role !== 'host') return 'host only';
      const seconds = Math.min(120, Math.max(3, Number(action.seconds) || 10));
      state.round = { endsAt: now + seconds * 1000, winner: null, open: true };
      return null;
    }
    if (action.type === 'buzz') {
      if (!who.id || !state.players[who.id]) return 'join first';
      if (!state.round?.open || state.round.winner) return 'too late';
      state.round.winner = who.id;
      state.round.open = false;
      state.players[who.id].score += 1;
      return null;
    }
    return 'unknown action';
  }

  /** What one device may see. */
  view(state, who) {
    const players = Object.entries(state.players).map(([id, p]) => ({ name: p.name, score: p.score, me: id === who.id }));
    const round = state.round && { open: state.round.open, endsAt: state.round.endsAt, winner: state.players[state.round.winner]?.name ?? null };
    return { role: who.role, joined: who.role === 'host' || !!who.id, players, round, now: Date.now() };
  }

  broadcast(state) {
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(JSON.stringify({ type: 'view', view: this.view(state, ws.deserializeAttachment()) })); } catch { /* gone */ }
    }
  }

  /** A Durable Object has one alarm: point it at whatever comes first, the end of a round or the room's expiry. */
  async save(state) {
    await this.ctx.storage.put('state', state);
    const next = Math.min(state.round?.open ? state.round.endsAt : Infinity, state.lastActive + ROOM_TTL);
    await this.ctx.storage.setAlarm(next);
  }

  async alarm() {
    const state = await this.ctx.storage.get('state');
    if (!state) return;
    const now = Date.now();
    if (now >= state.lastActive + ROOM_TTL) {
      for (const ws of this.ctx.getWebSockets()) ws.close(4410, 'room expired');
      return this.ctx.storage.deleteAll();
    }
    if (state.round?.open && now >= state.round.endsAt) state.round.open = false; // time's up
    await this.save(state);
    this.broadcast(state);
  }

  webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* already closed */ }
  }
}
#endif
