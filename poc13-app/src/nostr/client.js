import { Relay } from 'nostr-tools/relay';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { DEFAULT_RELAYS } from '@/config/app-config';
import { getState } from '@/state/store';
import { matchItemsByQuery } from '@/search/match-helpers';
import { getGutenbergIndex, ensureGutenbergIndexLoaded } from '@/search/index-loader';
import { emit } from '@/state/event-bus';
import { pushDiagnosticLog, updateResponderStats, updateRelayStatus } from '@/state/diagnostics';
import { getPeerId, isPeerReady } from '@/transport/peerjs-client';

const SEARCH_KIND = 25555;
const RESPONSE_KIND = 25556;
const WHO_HAS_KIND = 25557;
const AVAILABILITY_KIND = 25558;
const SHARE_KIND = 33333;
const RESPONDER_CACHE_MS = 5 * 60 * 1000;
const MAX_RESPONSES_PER_QUERY = 5;

let relayIndex = 0;
let relay = null;
let sub = null;

let secretKey;
let publicKey;

const listeners = new Set();
const availabilityListeners = new Set();
const answeredQueries = new Map();
const answeredWhoHasQueries = new Map();
let responderEnabled = true;
let responsesServed = 0;

updateResponderStats({
  enabled: responderEnabled,
  served: responsesServed,
  lastQuery: null,
  lastMatches: 0,
});

function bytesToHex(bytes) {
  return Array.from(bytes || [], (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (typeof hex !== 'string') return null;
  const normalized = hex.trim();
  if (!normalized || normalized.length % 2 !== 0) return null;
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return out;
}

function coerceSecretKey(source) {
  if (!source) return null;
  if (typeof source === 'string') {
    return hexToBytes(source);
  }
  if (Array.isArray(source)) {
    return Uint8Array.from(source);
  }
  if (source && typeof source === 'object') {
    if (Array.isArray(source.data)) {
      return Uint8Array.from(source.data);
    }
    const numericKeys = Object.keys(source)
      .map((key) => Number(key))
      .filter((num) => Number.isInteger(num) && num >= 0);
    if (numericKeys.length) {
      const maxIndex = Math.max(...numericKeys);
      const bytes = new Uint8Array(maxIndex + 1);
      numericKeys.forEach((idx) => {
        bytes[idx] = Number(source[idx]) & 0xff;
      });
      return bytes;
    }
  }
  return null;
}

function persistKeys(sk, pk) {
  try {
    window.localStorage.setItem(
      'nostr-keypair',
      JSON.stringify({
        secretKey: bytesToHex(sk),
        publicKey: pk,
      }),
    );
  } catch (error) {
    console.warn('[nostr] failed to persist keypair', error);
  }
}

function loadKeys() {
  if (secretKey && publicKey) return;
  const stored = window.localStorage.getItem('nostr-keypair');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const hydratedSecret = coerceSecretKey(parsed.secretKey);
      if (hydratedSecret && typeof parsed.publicKey === 'string') {
        secretKey = hydratedSecret;
        publicKey = parsed.publicKey;
        // Re-persist in the canonical hex format if necessary.
        if (typeof parsed.secretKey !== 'string') {
          persistKeys(secretKey, publicKey);
        }
        return;
      }
    } catch (error) {
      console.warn('[nostr] failed to parse stored keypair, generating new one', error);
    }
  }
  secretKey = generateSecretKey();
  publicKey = getPublicKey(secretKey);
  persistKeys(secretKey, publicKey);
}

async function connectRelay() {
  if (relay && relay.connected) return relay;

  loadKeys();

  if (sub) {
    sub.unsub();
    sub = null;
  }
  if (relay) {
    try {
      await relay.close();
    } catch (_) {
      // ignore
    }
    relay = null;
  }

  const url = DEFAULT_RELAYS[relayIndex % DEFAULT_RELAYS.length];
  relayIndex += 1;

  pushDiagnosticLog({
    source: 'nostr',
    message: `Connecting to relay ${url}`,
  });
  updateRelayStatus({
    url,
    status: 'connecting',
  });

  try {
    relay = await Relay.connect(url);
    pushDiagnosticLog({
      source: 'nostr',
      message: `Connected to relay ${url}`,
    });
    updateRelayStatus({
      url,
      status: 'connected',
    });
    subscribeToRelayEvents(relay);
  } catch (error) {
    console.warn('[nostr] relay connect failed', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'nostr',
      message: `Relay connection failed (${url}): ${error.message || error}`,
    });
    updateRelayStatus({
      url,
      status: 'error',
    });
    relay = null;
  }

  return relay;
}

function subscribeToRelayEvents(instance) {
  if (sub) {
    sub.close();
  }
  sub = instance.subscribe(
    [
      {
        kinds: [RESPONSE_KIND, SEARCH_KIND, WHO_HAS_KIND, AVAILABILITY_KIND],
        since: Math.floor(Date.now() / 1000),
      },
    ],
    {
      label: 'nostr-search-stream',
      onevent: (event) => handleEvent(instance, event),
    },
  );
}

async function handleEvent(instance, event) {
  updateRelayStatus({
    url: instance.url,
    status: 'connected',
    lastEvent: Date.now(),
  });

  if (event.kind === RESPONSE_KIND) {
    processSearchResponse(instance, event);
    return;
  }
  if (event.kind === SEARCH_KIND) {
    try {
      await maybeAnswerSearch(event);
    } catch (error) {
      console.warn('[nostr] responder error', error);
    }
    return;
  }
  if (event.kind === WHO_HAS_KIND) {
    try {
      await maybeAnnounceAvailability(event);
    } catch (error) {
      console.warn('[nostr] who-has responder error', error);
    }
    return;
  }
  if (event.kind === AVAILABILITY_KIND) {
    processAvailabilityAnnouncement(instance, event);
    return;
  }
}

function processSearchResponse(instance, event) {
  const idTag = event.tags.find((t) => t[0] === 'id');
  const titleTag = event.tags.find((t) => t[0] === 'title');
  const authorTag = event.tags.find((t) => t[0] === 'author');
  const queryTag = event.tags.find((t) => t[0] === 'q');

  if (!idTag || !titleTag) return;

  const payload = {
    id: idTag[1],
    title: titleTag[1],
    author: authorTag ? authorTag[1] : 'Unknown',
    query: queryTag ? queryTag[1] : '',
    relay: instance.url,
  };

  listeners.forEach((fn) => fn(payload));
}

function pruneAnsweredQueries() {
  const cutoff = Date.now() - RESPONDER_CACHE_MS;
  answeredQueries.forEach((timestamp, id) => {
    if (timestamp < cutoff) {
      answeredQueries.delete(id);
    }
  });
}

async function maybeAnswerSearch(event) {
  const queryTag = event.tags.find((t) => t[0] === 'q');
  const query = queryTag ? queryTag[1] : '';

  if (!responderEnabled) {
    pushDiagnosticLog({
      level: 'info',
      source: 'responder',
      message: `Responder paused; ignoring query "${query}"`,
    });
    return;
  }
  if (!event) return;

  loadKeys();

  if (event.pubkey === publicKey) return;

  if (!query) return;

  pruneAnsweredQueries();
  if (answeredQueries.has(event.id)) {
    return;
  }

  const state = getState();
  ensureGutenbergIndexLoaded().catch(() => {});
  const matches = matchItemsByQuery(query, {
    manifest: state.manifest,
    library: state.library,
    catalog: getGutenbergIndex(),
    limit: MAX_RESPONSES_PER_QUERY,
    preferLibrary: true,
  });

  if (!matches.length) {
    pushDiagnosticLog({
      level: 'info',
      source: 'responder',
      message: `No matches found for query "${query}"`,
    });
    return;
  }

  answeredQueries.set(event.id, Date.now());

  for (const item of matches) {
    await publishSearchResponse(item, query);
  }

  responsesServed += matches.length;
  const responderSnapshot = {
    served: responsesServed,
    lastQuery: query,
    lastMatches: matches.length,
    enabled: responderEnabled,
  };
  emit('nostr:responder', responderSnapshot);
  updateResponderStats(responderSnapshot);
  pushDiagnosticLog({
    level: 'info',
    source: 'responder',
    message: `Answered query "${query}" with ${matches.length} entr${matches.length === 1 ? 'y' : 'ies'}`,
  });
}

async function publishSearchResponse(item, query) {
  if (!item) return;
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] responder connect failed', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'responder',
      message: `Failed to connect relay for response: ${error.message || error}`,
    });
    return;
  }
  if (!relay) return;

  const tags = [
    ['id', item.id || ''],
    ['title', item.title || ''],
    ['author', item.author || 'Unknown'],
  ];

  if (query) {
    tags.push(['q', query]);
  }
  if (item.size_kb) {
    tags.push(['size', String(item.size_kb)]);
  }

  const content = item.summary ? item.summary.slice(0, 280) : `library:${item.id}`;

  const eventTemplate = {
    kind: RESPONSE_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
    pubkey: publicKey,
  };

  const signed = finalizeEvent(eventTemplate, secretKey);

  try {
    await relay.publish(signed);
  } catch (error) {
    console.warn('[nostr] failed to publish response', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'responder',
      message: `Failed to publish response for "${item.title}": ${error.message || error}`,
    });
  }
}

function processAvailabilityAnnouncement(instance, event) {
  const idTag = event.tags.find((t) => t[0] === 'id');
  const toTag = event.tags.find((t) => t[0] === 'to');
  const transportsTag = event.tags.find((t) => t[0] === 'transports');
  const peerTag = event.tags.find((t) => t[0] === 'peer');

  if (!idTag) return;

  // Check if this announcement is directed to us
  if (toTag && toTag[1] !== publicKey) {
    return;
  }

  let transports = [];
  if (transportsTag) {
    try {
      transports = JSON.parse(transportsTag[1]);
    } catch (_) {
      transports = [transportsTag[1]];
    }
  }

  const payload = {
    bookId: idTag[1],
    peerPubkey: event.pubkey,
    peerId: peerTag ? peerTag[1] : '',
    transports,
    relay: instance.url,
  };

  availabilityListeners.forEach((fn) => fn(payload));

  pushDiagnosticLog({
    source: 'transport',
    message: `Peer ${event.pubkey.slice(0, 8)}... has book ${idTag[1]} via ${transports.join(', ')}`,
  });
}

async function maybeAnnounceAvailability(event) {
  const idTag = event.tags.find((t) => t[0] === 'id');
  const bookId = idTag ? idTag[1] : '';

  if (!responderEnabled) {
    return;
  }

  if (!bookId) return;

  loadKeys();

  // Don't respond to our own queries
  if (event.pubkey === publicKey) return;

  // Check if we've already responded to this query recently
  pruneAnsweredWhoHasQueries();
  if (answeredWhoHasQueries.has(event.id)) {
    return;
  }

  // Check if we have this book in our library
  const state = getState();
  const haveIt = state.library.find((item) => item.id === bookId);

  if (!haveIt) {
    return;
  }

  answeredWhoHasQueries.set(event.id, Date.now());

  // Announce that we have it
  await publishAvailability(bookId, event.pubkey, haveIt);
}

function pruneAnsweredWhoHasQueries() {
  const cutoff = Date.now() - RESPONDER_CACHE_MS;
  answeredWhoHasQueries.forEach((timestamp, id) => {
    if (timestamp < cutoff) {
      answeredWhoHasQueries.delete(id);
    }
  });
}

async function publishAvailability(bookId, targetPubkey, item) {
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] failed to connect relay for availability', error);
    return;
  }
  if (!relay) return;

  const transports = [];
  if (isPeerReady()) {
    transports.push('peerjs');
  }

  const tags = [
    ['id', bookId],
    ['to', targetPubkey],
    ['transports', JSON.stringify(transports)],
  ];

  const myPeerId = getPeerId();
  if (myPeerId) {
    tags.push(['peer', myPeerId]);
  }

  const eventTemplate = {
    kind: AVAILABILITY_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: `I have: ${item.title || bookId}`,
    pubkey: publicKey,
  };

  const signed = finalizeEvent(eventTemplate, secretKey);

  try {
    await relay.publish(signed);
    pushDiagnosticLog({
      source: 'transport',
      message: `Announced availability of "${item.title || bookId}" to ${targetPubkey.slice(0, 8)}... via ${transports.join(', ') || 'no transport'}`,
    });
  } catch (error) {
    console.warn('[nostr] failed to publish availability', error);
  }
}

export function subscribeToSearchResults(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeToAvailability(listener) {
  availabilityListeners.add(listener);
  return () => availabilityListeners.delete(listener);
}

export async function sendSearchRequest(query) {
  if (!query) return;

  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] failed to connect relay', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'search',
      message: `Failed to connect relay for search "${query}"`,
    });
    return;
  }

  if (!relay) return;

  const eventTemplate = {
    kind: SEARCH_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['q', query]],
    content: `search:${query}`,
    pubkey: publicKey,
  };

  const signed = finalizeEvent(eventTemplate, secretKey);

  try {
    await relay.publish(signed);
    pushDiagnosticLog({
      source: 'search',
      message: `Published search for "${query}"`,
    });
  } catch (error) {
    console.warn('[nostr] failed to publish search', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'search',
      message: `Failed to publish search "${query}": ${error.message || error}`,
    });
  }
}

export async function sendWhoHasRequest(bookId) {
  if (!bookId) return;

  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] failed to connect relay', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'transport',
      message: `Failed to connect relay for who-has "${bookId}"`,
    });
    return;
  }

  if (!relay) return;

  const eventTemplate = {
    kind: WHO_HAS_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['id', bookId]],
    content: `Who has: ${bookId}`,
    pubkey: publicKey,
  };

  const signed = finalizeEvent(eventTemplate, secretKey);

  try {
    await relay.publish(signed);
    pushDiagnosticLog({
      source: 'transport',
      message: `Published who-has query for book "${bookId}"`,
    });
  } catch (error) {
    console.warn('[nostr] failed to publish who-has', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'transport',
      message: `Failed to publish who-has "${bookId}": ${error.message || error}`,
    });
  }
}

export async function initNostrClient() {
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] connection error', error);
  }
}

export function setSearchResponderEnabled(enabled) {
  responderEnabled = Boolean(enabled);
  if (!responderEnabled) {
    answeredQueries.clear();
  }
  const responderSnapshot = {
    enabled: responderEnabled,
    served: responsesServed,
    lastQuery: null,
    lastMatches: 0,
  };
  emit('nostr:responder', responderSnapshot);
  updateResponderStats(responderSnapshot);
  pushDiagnosticLog({
    source: 'responder',
    message: responderEnabled ? 'Search responder enabled' : 'Search responder paused',
  });
}

export function toggleSearchResponder() {
  setSearchResponderEnabled(!responderEnabled);
  return responderEnabled;
}

export function isSearchResponderEnabled() {
  return responderEnabled;
}

export async function publishShareEvent(items = []) {
  if (!items.length) return;
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] failed to connect relay for share', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'share',
      message: `Failed to connect relay for share (${error.message || error})`,
    });
    return;
  }
  if (!relay) return;

  const tags = items.slice(0, 25).map((item) => [
    'item',
    item.id || '',
    item.infohash || '',
    item.title || '',
  ]);

  const eventTemplate = {
    kind: SHARE_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: `share:${items.length}`,
    pubkey: publicKey,
  };

  const signed = finalizeEvent(eventTemplate, secretKey);

  try {
    await relay.publish(signed);
    pushDiagnosticLog({
      source: 'share',
      message: `Published share event with ${items.length} items`,
    });
  } catch (error) {
    console.warn('[nostr] failed to publish share', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'share',
      message: `Failed to publish share: ${error.message || error}`,
    });
  }

  // Ensure latest key format is stored for subsequent sessions.
  persistKeys(secretKey, publicKey);
}
