const subscribers = new Map();

function ensureChannel(channel) {
  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set());
  }
  return subscribers.get(channel);
}

/**
 * Subscribe to a channel.
 * @param {string} channel
 * @param {(payload: any) => void} handler
 * @returns {() => void} unsubscribe function
 */
export function subscribe(channel, handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('event-bus handler must be a function');
  }
  const group = ensureChannel(channel);
  group.add(handler);
  return () => {
    group.delete(handler);
    if (group.size === 0) {
      subscribers.delete(channel);
    }
  };
}

/**
 * Emit a payload to a channel.
 * @param {string} channel
 * @param {any} payload
 */
export function emit(channel, payload) {
  const group = subscribers.get(channel);
  if (!group) return;
  group.forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[event-bus] handler error on ${channel}`, error);
    }
  });
}

/**
 * Subscribe once and auto-unsubscribe after the first emission.
 * @param {string} channel
 * @param {(payload: any) => void} handler
 */
export function once(channel, handler) {
  const unsubscribe = subscribe(channel, (payload) => {
    unsubscribe();
    handler(payload);
  });
  return unsubscribe;
}

/**
 * Snapshot the current subscriber state—useful for diagnostics.
 */
export function getSubscriberSnapshot() {
  const snapshot = {};
  subscribers.forEach((handlers, channel) => {
    snapshot[channel] = handlers.size;
  });
  return snapshot;
}

/**
 * Broadcast telemetry into `window.__NOSTR_LIB_DIAGNOSTICS` if available.
 */
export function reportTelemetry(event, data) {
  const diagnostics = typeof window !== 'undefined' ? window.__NOSTR_LIB_DIAGNOSTICS : null;
  if (diagnostics && typeof diagnostics.push === 'function') {
    diagnostics.push({
      event,
      data,
      timestamp: Date.now(),
    });
  }
}
