import sampleManifest from '../data/sample-manifest.json';
import { emit } from './event-bus';
import { loadLibraryItems, saveLibraryItems } from './persistence';

const state = {
  manifest: sampleManifest,
  library: [],
  initialized: false,
};

const observers = new Set();

function notify() {
  const snapshot = getState();
  observers.forEach((fn) => fn(snapshot));
  emit('state:update', snapshot);
}

export function getState() {
  return {
    manifest: state.manifest,
    library: state.library,
    initialized: state.initialized,
  };
}

export function subscribe(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('store.subscribe requires a function');
  }
  observers.add(handler);
  handler(getState());
  return () => observers.delete(handler);
}

export async function initStore() {
  if (state.initialized) return getState();
  const existing = await loadLibraryItems();
  state.library = Array.isArray(existing) ? existing : [];
  state.initialized = true;
  notify();
  return getState();
}

export async function saveToLibrary(item) {
  if (!item || !item.id) {
    throw new Error('Cannot save item without id');
  }
  const exists = state.library.some((entry) => entry.id === item.id);
  if (exists) return getState();
  state.library = [...state.library, item];
  await saveLibraryItems(state.library);
  notify();
  return getState();
}

export async function removeFromLibrary(id) {
  const next = state.library.filter((item) => item.id !== id);
  if (next.length === state.library.length) return getState();
  state.library = next;
  await saveLibraryItems(state.library);
  notify();
  return getState();
}

export function getSampleItems(limit = 5) {
  return state.manifest.slice(0, limit);
}

export function __resetStore() {
  state.library = [];
  state.initialized = false;
  observers.clear();
}
