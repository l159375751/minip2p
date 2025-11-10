export const APP_NAME = 'Browser-Only Nostr Library Hub';

export const DEFAULT_RELAYS = [
  'wss://relay.0x6d.net',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.damus.io',
];

export const RELAY_FAILOVER_INTERVAL_MS = 5_000;
export const RELAY_TIMEOUT_MS = 5_000;

export const TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'udp://tracker.opentrackr.org:1337',
  'udp://open.demonoid.ch:6969',
  'udp://tracker.torrent.eu.org:451',
  'udp://exodus.desync.com:6969',
];

export const PERFORMANCE_BUDGETS = {
  coldLoadMs: 2500,
  searchResultMs: 1000,
  throughputKBps: 400,
  bundleKB: 300,
};

export const SAMPLE_COLLECTION_INFOHASHES = {
  full: '38ea08e57e7fd054ed83165b7705bd57ca0250af',
  mini10: 'bbd456a15950aef60ab28e786ae291d00e5fa934',
  mini100: '9dfeaa10e1be1e8d7b5efca400c966335c65447e',
};

export const STORAGE_LIMIT_WARNING_GB = 11;

export const FEATURE_FLAGS = {
  enableLibp2p: false,
  allowCustomWidgets: false,
};

export const buildMagnetFromInfohash = (infohash, trackers = TRACKERS) => {
  if (!infohash) return '';
  const trackerQuery = trackers.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join('');
  return `magnet:?xt=urn:btih:${infohash}${trackerQuery}`;
};

export default {
  APP_NAME,
  DEFAULT_RELAYS,
  TRACKERS,
  PERFORMANCE_BUDGETS,
  SAMPLE_COLLECTION_INFOHASHES,
  buildMagnetFromInfohash,
  STORAGE_LIMIT_WARNING_GB,
  RELAY_FAILOVER_INTERVAL_MS,
  RELAY_TIMEOUT_MS,
  FEATURE_FLAGS,
};
