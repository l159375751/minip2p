import { subscribeToAvailability, sendWhoHasRequest } from '@/nostr/client';
import { pushDiagnosticLog } from '@/state/diagnostics';

const transportState = {
  // bookId -> array of {peerPubkey, peerId, transports, relay}
  availablePeers: new Map(),
  listeners: new Set(),
};

function notify(bookId) {
  const peers = transportState.availablePeers.get(bookId) || [];
  const snapshot = { bookId, peers };
  transportState.listeners.forEach((fn) => fn(snapshot));
}

export function subscribeToTransports(listener) {
  transportState.listeners.add(listener);
  return () => transportState.listeners.delete(listener);
}

export function requestBookTransport(bookId) {
  if (!bookId) return;

  // Clear previous peers for this book
  transportState.availablePeers.delete(bookId);
  notify(bookId);

  // Send who-has query
  sendWhoHasRequest(bookId);

  pushDiagnosticLog({
    source: 'transport',
    message: `Requesting transports for book "${bookId}"`,
  });

  // Auto-timeout after 30 seconds
  setTimeout(() => {
    const peers = transportState.availablePeers.get(bookId) || [];
    if (peers.length === 0) {
      pushDiagnosticLog({
        level: 'warn',
        source: 'transport',
        message: `No peers responded for book "${bookId}"`,
      });
    }
  }, 30000);
}

export function getAvailablePeers(bookId) {
  return transportState.availablePeers.get(bookId) || [];
}

function handleAvailabilityAnnouncement(payload) {
  const { bookId, peerPubkey, peerId, transports, relay } = payload;

  if (!bookId) return;

  const peers = transportState.availablePeers.get(bookId) || [];

  // Check if we already have this peer
  const exists = peers.some((p) => p.peerPubkey === peerPubkey);
  if (exists) return;

  // Add the peer
  peers.push({ peerPubkey, peerId, transports, relay });
  transportState.availablePeers.set(bookId, peers);

  notify(bookId);

  pushDiagnosticLog({
    source: 'transport',
    message: `Peer ${peerPubkey.slice(0, 8)}... offers book ${bookId} via ${transports.join(', ') || 'no transport'}`,
  });
}

// Initialize
subscribeToAvailability(handleAvailabilityAnnouncement);
