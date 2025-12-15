
import WebSocket from 'ws';

const TRACKER_URL = 'wss://tracker.0x6d.net';

console.log(`Attempting to connect to ${TRACKER_URL}`);

const ws = new WebSocket(TRACKER_URL, {
  headers: {
    'User-Agent': 'Node-WebSocket-Test-Client/1.0'
  }
});

ws.on('open', function open() {
  console.log('Connection successful! The WSS connection to the tracker is working.');
  // A real client would send an announce request here.
  // For this test, we just confirm the connection opens.
  ws.close();
});

ws.on('error', function error(err) {
  console.error('Connection error:', err.message);
  if (err.message.includes('SSL')) {
    console.error('This might be an SSL/TLS certificate issue with the tracker or a proxy.');
  }
});

ws.on('close', function close(code, reason) {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
});
