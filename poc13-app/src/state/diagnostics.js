const MAX_LOGS = 50;

const state = {
  responder: {
    enabled: true,
    served: 0,
    lastQuery: null,
    lastMatches: 0,
  },
  relay: {
    url: null,
    status: 'disconnected',
    lastEvent: null,
  },
  logs: [],
};

const listeners = new Set();

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function notify() {
  const snapshot = getDiagnostics();
  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

function generateLogId() {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getDiagnostics() {
  return deepClone(state);
}

export function subscribeDiagnostics(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('subscribeDiagnostics listener must be a function');
  }
  listeners.add(listener);
  listener(getDiagnostics());
  return () => listeners.delete(listener);
}

export function pushDiagnosticLog({
  level = 'info',
  source = 'nostr',
  message = '',
} = {}) {
  const entry = {
    id: generateLogId(),
    level,
    source,
    message,
    timestamp: Date.now(),
  };
  state.logs = [entry, ...state.logs].slice(0, MAX_LOGS);
  notify();
}

export function updateResponderStats(partial) {
  state.responder = {
    ...state.responder,
    ...partial,
  };
  notify();
}

export function updateRelayStatus(partial) {
  state.relay = {
    ...state.relay,
    ...partial,
  };
  notify();
}
