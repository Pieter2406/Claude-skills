// Connects this device to a live room and keeps it connected: reconnects after a phone lock or lost signal,
// queues taps made while offline, and remembers who this device is (host key or player id) per room.
//
//   import { createRoom, joinRoom } from './room.js';
//   const { code } = await createRoom();                 // host device: makes a room, keeps the host key
//   const room = joinRoom(code, { onView, onError, onStatus });
//   room.send({ type: 'join', name: 'De Slimmeriken' });  // player device, once
//   room.send({ type: 'buzz' });
//
// onView(view) gets the device's own view after every change; onStatus('online' | 'reconnecting' | 'gone').
const KEY = (code) => `room:${code}`;

const remember = (code, patch) => {
  try {
    const old = JSON.parse(localStorage.getItem(KEY(code)) ?? '{}');
    localStorage.setItem(KEY(code), JSON.stringify({ ...old, ...patch }));
  } catch { /* private mode: identity lasts until the page closes */ }
};
const recall = (code) => {
  try { return JSON.parse(localStorage.getItem(KEY(code)) ?? '{}'); } catch { return {}; }
};

export async function createRoom() {
  const res = await fetch('/api/rooms', { method: 'POST' });
  if (!res.ok) throw new Error('Could not create a room');
  const { code, hostKey } = await res.json();
  remember(code, { key: hostKey });
  return { code };
}

export function joinRoom(rawCode, { onView = () => {}, onError = () => {}, onStatus = () => {} } = {}) {
  const code = rawCode.trim().toUpperCase();
  const queue = [];
  let ws = null;
  let retry = 0;
  let closed = false;
  let pinger = 0;

  function url() {
    const me = recall(code);
    const q = new URLSearchParams();
    if (me.key) q.set('key', me.key);
    if (me.player) q.set('player', me.player);
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/room/${code}?${q}`;
  }

  function connect() {
    ws = new WebSocket(url());
    ws.onopen = () => {
      retry = 0;
      onStatus('online');
      while (queue.length) ws.send(queue.shift());
      clearInterval(pinger);
      pinger = setInterval(() => ws?.readyState === 1 && ws.send('ping'), 25_000);
    };
    ws.onmessage = (e) => {
      if (e.data === 'pong') return;
      const msg = JSON.parse(e.data);
      if (msg.type === 'view') onView(msg.view);
      else if (msg.type === 'joined') remember(code, { player: msg.player });
      else if (msg.type === 'error') {
        onError(msg.error);
        if (msg.error === 'no-room') {
          closed = true;
          onStatus('gone');
          ws.close(1000);
        }
      }
    };
    ws.onclose = (e) => {
      clearInterval(pinger);
      if (closed) return;
      if (e.code === 4404 || e.code === 4410) {
        closed = true;
        onStatus('gone');
        return;
      }
      onStatus('reconnecting');
      setTimeout(connect, Math.min(10_000, 500 * 2 ** retry++));
    };
  }

  // Coming back to the app (phone unlocked, tab shown): reconnect at once instead of waiting for the backoff.
  const wake = () => {
    if (document.visibilityState === 'visible' && !closed && ws?.readyState !== 1 && ws?.readyState !== 0) connect();
  };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  connect();

  return {
    code,
    send(action) {
      const text = JSON.stringify(action);
      if (ws?.readyState === 1) ws.send(text);
      else queue.push(text);
    },
    close() {
      closed = true;
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      ws?.close(1000);
    },
  };
}
