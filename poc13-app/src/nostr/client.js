import { Relay } from 'nostr-tools/relay';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { DEFAULT_RELAYS } from '@/config/app-config';
import { getState } from '@/state/store';
import { matchItemsByQuery } from '@/search/match-helpers';
import { emit } from '@/state/event-bus';

const SEARCH_KIND = 25555;
const RESPONSE_KIND = 25556;
const SHARE_KIND = 33333;
const RESPONDER_CACHE_MS = 5 * 60 * 1000;
const MAX_RESPONSES_PER_QUERY = 5;

let relayIndex = 0;
let relay = null;
let sub = null;

let secretKey;
let publicKey;

const listeners = new Set();
const answeredQueries = new Map();
let responderEnabled = false;
let responsesServed = 0;

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

  try {
    relay = await Relay.connect(url);
    subscribeToRelayEvents(relay);
  } catch (error) {
    console.warn('[nostr] relay connect failed', error);
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
        kinds: [RESPONSE_KIND, SEARCH_KIND],
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
  }
}

function processSearchResponse(instance, event) {
  const idTag = event.tags.find((t) => t[0] === 'id');
  const titleTag = event.tags.find((t) => t[0] === 'title');
  const authorTag = event.tags.find((t) => t[0] === 'author');
  const hashTag = event.tags.find((t) => t[0] === 'hash');
  const queryTag = event.tags.find((t) => t[0] === 'q');

  if (!idTag || !titleTag) return;

  const payload = {
    id: idTag[1],
    title: titleTag[1],
    author: authorTag ? authorTag[1] : 'Unknown',
    infohash: hashTag ? hashTag[1] : '',
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
  if (!responderEnabled) return;
  if (!event) return;

  loadKeys();

  if (event.pubkey === publicKey) return;

  const queryTag = event.tags.find((t) => t[0] === 'q');
  const query = queryTag ? queryTag[1] : '';
  if (!query) return;

  pruneAnsweredQueries();
  if (answeredQueries.has(event.id)) return;

  const state = getState();
  const matches = matchItemsByQuery(query, {
    manifest: state.manifest,
    library: state.library,
    limit: MAX_RESPONSES_PER_QUERY,
    preferLibrary: true,
  });

  if (!matches.length) return;

  answeredQueries.set(event.id, Date.now());

  for (const item of matches) {
    await publishSearchResponse(item, query);
  }

  responsesServed += matches.length;
  emit('nostr:responder', {
    served: responsesServed,
    lastQuery: query,
    matches: matches.length,
    enabled: responderEnabled,
  });
}

async function publishSearchResponse(item, query) {
  if (!item) return;
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] responder connect failed', error);
    return;
  }
  if (!relay) return;

  const tags = [
    ['id', item.id || ''],
    ['title', item.title || ''],
    ['author', item.author || 'Unknown'],
  ];

  if (item.infohash) {
    tags.push(['hash', item.infohash]);
  }
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
  }
}

export function subscribeToSearchResults(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function sendSearchRequest(query) {
  if (!query) return;

  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] failed to connect relay', error);
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
  } catch (error) {
    console.warn('[nostr] failed to publish search', error);
  }
}

export async function initNostrClient() {
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] connection error', error);
  }
}

export function setResponderEnabled(enabled) {
  responderEnabled = Boolean(enabled);
  if (!responderEnabled) {
    answeredQueries.clear();
  }
  emit('nostr:responder', {
    enabled: responderEnabled,
    served: responsesServed,
    lastQuery: null,
    matches: 0,
  });
}

export async function publishShareEvent(items = []) {
  if (!items.length) return;
  try {
    await connectRelay();
  } catch (error) {
    console.warn('[nostr] failed to connect relay for share', error);
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
  } catch (error) {
    console.warn('[nostr] failed to publish share', error);
  }

  // Ensure latest key format is stored for subsequent sessions.
  persistKeys(secretKey, publicKey);
}
