import Peer from 'peerjs';
import { pushDiagnosticLog } from '@/state/diagnostics';
import { getState } from '@/state/store';

const CHUNK_SIZE = 128 * 1024; // 128KB chunks

let peer = null;
let peerId = null;
const activeConnections = new Map();
const incomingTransfers = new Map();
const transferProgressListeners = new Set();

export function getPeerId() {
  return peerId;
}

export function isPeerReady() {
  return peer && peerId;
}

function notifyTransferProgress(transfer) {
  transferProgressListeners.forEach((fn) => fn(transfer));
}

export function subscribeToTransferProgress(listener) {
  transferProgressListeners.add(listener);
  return () => transferProgressListeners.delete(listener);
}

export function initPeerJS() {
  if (peer) return Promise.resolve(peerId);

  return new Promise((resolve, reject) => {
    peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('open', (id) => {
      peerId = id;
      pushDiagnosticLog({
        source: 'peerjs',
        message: `PeerJS initialized with ID: ${id}`,
      });
      resolve(id);
    });

    peer.on('error', (error) => {
      console.error('[peerjs] error', error);
      pushDiagnosticLog({
        level: 'error',
        source: 'peerjs',
        message: `PeerJS error: ${error.type || error.message || error}`,
      });
      reject(error);
    });

    peer.on('connection', (conn) => {
      pushDiagnosticLog({
        source: 'peerjs',
        message: `Incoming connection from ${conn.peer}`,
      });
      setupConnection(conn, { role: 'provider' });
    });

    peer.on('disconnected', () => {
      pushDiagnosticLog({
        level: 'warn',
        source: 'peerjs',
        message: 'PeerJS disconnected from signaling server',
      });
    });
  });
}

function setupConnection(conn, context) {
  activeConnections.set(conn.peer, conn);

  conn.on('open', () => {
    pushDiagnosticLog({
      source: 'peerjs',
      message: `Data channel open with ${conn.peer}`,
    });

    if (context.role === 'requester' && context.bookId) {
      // Send book request
      conn.send(
        JSON.stringify({
          type: 'request',
          bookId: context.bookId,
        }),
      );
      pushDiagnosticLog({
        source: 'peerjs',
        message: `Requested book ${context.bookId} from ${conn.peer}`,
      });
    }
  });

  conn.on('data', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handlePeerMessage(conn, msg, context);
    } catch (error) {
      console.warn('[peerjs] failed to parse message', error);
    }
  });

  conn.on('close', () => {
    pushDiagnosticLog({
      source: 'peerjs',
      message: `Connection closed with ${conn.peer}`,
    });
    activeConnections.delete(conn.peer);
  });

  conn.on('error', (error) => {
    console.error('[peerjs] connection error', error);
    pushDiagnosticLog({
      level: 'error',
      source: 'peerjs',
      message: `Connection error with ${conn.peer}: ${error.type || error}`,
    });
  });
}

function handlePeerMessage(conn, msg, context) {
  const { type } = msg;

  if (type === 'request') {
    // Peer is requesting a book from us
    handleBookRequest(conn, msg);
    return;
  }

  if (type === 'meta') {
    // Incoming transfer metadata
    prepareIncomingTransfer(conn, msg);
    return;
  }

  if (type === 'chunk') {
    // Incoming data chunk
    handleIncomingChunk(conn, msg);
    return;
  }

  if (type === 'complete') {
    // Transfer complete
    finalizeIncomingTransfer(conn, msg);
    return;
  }

  if (type === 'error') {
    pushDiagnosticLog({
      level: 'error',
      source: 'peerjs',
      message: `Peer ${conn.peer} sent error: ${msg.message}`,
    });
    window.alert(`Error from peer: ${msg.message}`);
    return;
  }
}

function handleBookRequest(conn, msg) {
  const { bookId } = msg;
  const state = getState();
  const book = state.library.find((item) => item.id === bookId);

  if (!book) {
    conn.send(
      JSON.stringify({
        type: 'error',
        message: 'Book not found in library',
      }),
    );
    pushDiagnosticLog({
      level: 'warn',
      source: 'peerjs',
      message: `Peer ${conn.peer} requested unavailable book ${bookId}`,
    });
    return;
  }

  pushDiagnosticLog({
    source: 'peerjs',
    message: `Sending book ${bookId} (${book.title}) to ${conn.peer}`,
  });

  sendBookToPeer(conn, book);
}

function sendBookToPeer(conn, book) {
  const data = JSON.stringify(book);
  const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

  // Send metadata first
  conn.send(
    JSON.stringify({
      type: 'meta',
      bookId: book.id,
      title: book.title,
      author: book.author,
      totalChunks,
      totalSize: data.length,
    }),
  );

  // Send chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, data.length);
    const chunk = data.slice(start, end);

    conn.send(
      JSON.stringify({
        type: 'chunk',
        bookId: book.id,
        index: i,
        chunk,
      }),
    );
  }

  // Send completion signal
  conn.send(
    JSON.stringify({
      type: 'complete',
      bookId: book.id,
    }),
  );

  pushDiagnosticLog({
    source: 'peerjs',
    message: `Finished sending book ${book.id} (${totalChunks} chunks)`,
  });
}

function getTransferKey(peerId, bookId) {
  return `${peerId}:${bookId}`;
}

function prepareIncomingTransfer(conn, msg) {
  const { bookId, title, author, totalChunks, totalSize } = msg;
  const key = getTransferKey(conn.peer, bookId);

  const transfer = {
    bookId,
    title,
    author,
    peerId: conn.peer,
    totalChunks,
    totalSize,
    receivedChunks: 0,
    chunks: new Array(totalChunks).fill(null),
    status: 'receiving',
  };

  incomingTransfers.set(key, transfer);

  pushDiagnosticLog({
    source: 'peerjs',
    message: `Starting download: ${title} (${totalChunks} chunks, ${Math.round(totalSize / 1024)}KB)`,
  });

  notifyTransferProgress(transfer);
}

function handleIncomingChunk(conn, msg) {
  const { bookId, index, chunk } = msg;
  const key = getTransferKey(conn.peer, bookId);
  const transfer = incomingTransfers.get(key);

  if (!transfer) {
    console.warn('[peerjs] received chunk for unknown transfer', bookId);
    return;
  }

  transfer.chunks[index] = chunk;
  transfer.receivedChunks += 1;

  pushDiagnosticLog({
    source: 'peerjs',
    message: `Received chunk ${transfer.receivedChunks}/${transfer.totalChunks} for ${transfer.title}`,
  });

  notifyTransferProgress(transfer);
}

async function finalizeIncomingTransfer(conn, msg) {
  const { bookId } = msg;
  const key = getTransferKey(conn.peer, bookId);
  const transfer = incomingTransfers.get(key);

  if (!transfer) {
    console.warn('[peerjs] received completion for unknown transfer', bookId);
    return;
  }

  // Combine all chunks
  const combined = transfer.chunks.join('');

  try {
    const book = JSON.parse(combined);

    transfer.status = 'complete';
    notifyTransferProgress(transfer);

    pushDiagnosticLog({
      source: 'peerjs',
      message: `Download complete: ${transfer.title}`,
    });

    // TODO: Save to library
    window.alert(`Book received: ${book.title}\n\nSaving to library coming soon!`);

    incomingTransfers.delete(key);
  } catch (error) {
    console.error('[peerjs] failed to parse received book', error);
    transfer.status = 'error';
    transfer.error = 'Failed to parse book data';
    notifyTransferProgress(transfer);

    pushDiagnosticLog({
      level: 'error',
      source: 'peerjs',
      message: `Failed to parse book ${bookId}: ${error.message}`,
    });

    window.alert(`Error: Failed to parse received book data`);
  }
}

export function requestBookFromPeer(remotePeerId, bookId) {
  if (!peer || !peerId) {
    window.alert('PeerJS not initialized. Please wait...');
    return;
  }

  pushDiagnosticLog({
    source: 'peerjs',
    message: `Connecting to peer ${remotePeerId} for book ${bookId}`,
  });

  const conn = peer.connect(remotePeerId, { reliable: true });
  setupConnection(conn, { role: 'requester', bookId });
}

export function getActiveTransfers() {
  return Array.from(incomingTransfers.values());
}
