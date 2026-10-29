// App logic. Keep state in one object, render from it, and save it after every change.
const KEY = '__NAME__:v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: the app still works, it just forgets */ }
}

const state = load();
save(state);
