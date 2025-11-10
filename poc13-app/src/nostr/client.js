import { Relay } from 'nostr-tools/relay';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { DEFAULT_RELAYS } from '@/config/app-config';

const SEARCH_KIND = 25555;
const RESPONSE_KIND = 25556;
const SHARE_KIND = 33333;

let relayIndex = 0;
let relay = null;
let sub = null;

let secretKey;
let publicKey;

const listeners = new Set();

function loadKeys() {
  if (secretKey && publicKey) return;
  const stored = window.localStorage.getItem('nostr-keypair');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      secretKey = parsed.secretKey;
      publicKey = parsed.publicKey;
      return;
    } catch (_) {
      // fall through
    }
  }
  secretKey = generateSecretKey();
  publicKey = getPublicKey(secretKey);
  window.localStorage.setItem('nostr-keypair', JSON.stringify({ secretKey, publicKey }));
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
    subscribeToResponses(relay);
  } catch (error) {
    console.warn('[nostr] relay connect failed', error);
    relay = null;
  }

  return relay;
}

function subscribeToResponses(instance) {
  if (sub) {
    sub.close();
  }
  sub = instance.subscribe(
    {
      kinds: [RESPONSE_KIND],
      since: Math.floor(Date.now() / 1000),
    },
    {
      label: 'search-responses',
      receivedEvent: (event) => handleEvent(instance, event),
    },
  );
}

function handleEvent(instance, event) {
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
}
