import { getState } from './store.js';
import { publishShareEvent, setResponderEnabled } from '@/nostr/client.js';

const sharingState = {
  enabled: false,
  listeners: new Set(),
};

function notify() {
  const snapshot = { enabled: sharingState.enabled };
  sharingState.listeners.forEach((fn) => fn(snapshot));
}

export function subscribeSharing(listener) {
  sharingState.listeners.add(listener);
  listener({ enabled: sharingState.enabled });
  return () => sharingState.listeners.delete(listener);
}

export function isSharingEnabled() {
  return sharingState.enabled;
}

export async function toggleSharing() {
  sharingState.enabled = !sharingState.enabled;
  setResponderEnabled(sharingState.enabled);
  notify();
  if (sharingState.enabled) {
    const state = getState();
    const payload = state.library.length ? state.library : state.manifest.slice(0, 5);
    publishShareEvent(payload);
  }
}

setResponderEnabled(sharingState.enabled);
