import { pushDiagnosticLog } from '@/state/diagnostics';

const INDEX_URL = '/minip2p/poc10/GUTINDEX.ALL.new';
const STORAGE_KEY = 'gutenberg-index-v1';
const MAX_ENTRIES = 5000;

let catalog = [];
let loadPromise = null;

function tryLoadCache() {
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
  } catch (error) {
    console.warn('[index-loader] failed to read cache', error);
  }
  return null;
}

function trySaveCache(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[index-loader] failed to save cache', error);
  }
}

function parseTitleAuthor(raw) {
  const marker = ', by ';
  const idx = raw.toLowerCase().lastIndexOf(', by ');
  if (idx !== -1) {
    return {
      title: raw.slice(0, idx).trim(),
      author: raw.slice(idx + marker.length).trim() || 'Unknown',
    };
  }
  return {
    title: raw.trim(),
    author: 'Unknown',
  };
}

function parseIndex(text) {
  const entries = [];
  const lines = text.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const idPart = line.slice(0, colon).trim();
    if (!/^\d+$/.test(idPart)) continue;
    const rest = line.slice(colon + 1).trim();
    if (!rest) continue;
    const sizeSplit = rest.search(/\s{2,}|\t+/);
    const titleChunk = sizeSplit >= 0 ? rest.slice(0, sizeSplit).trim() : rest;
    if (!titleChunk) continue;
    const { title, author } = parseTitleAuthor(titleChunk.replace(/\s+/g, ' '));
    entries.push({
      id: `gutenberg-${idPart}`,
      title,
      author,
      infohash: '',
      summary: 'External catalog entry',
    });
    if (entries.length >= MAX_ENTRIES) break;
  }
  return entries;
}

async function downloadIndex() {
  pushDiagnosticLog({
    source: 'index',
    message: 'Downloading Gutenberg catalog…',
  });
  const response = await fetch(INDEX_URL, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const text = await response.text();
  const parsed = parseIndex(text);
  catalog = parsed;
  pushDiagnosticLog({
    source: 'index',
    message: `Loaded ${parsed.length} Gutenberg entries`,
  });
  trySaveCache(parsed);
  return catalog;
}

export function getGutenbergIndex() {
  return catalog;
}

export async function ensureGutenbergIndexLoaded() {
  if (catalog.length) return catalog;
  if (loadPromise) return loadPromise;

  const cached = tryLoadCache();
  if (cached) {
    catalog = cached;
    pushDiagnosticLog({
      source: 'index',
      message: `Loaded ${cached.length} catalog entries from cache`,
    });
    return catalog;
  }

  loadPromise = downloadIndex().catch((error) => {
    pushDiagnosticLog({
      level: 'error',
      source: 'index',
      message: `Failed to download catalog: ${error.message || error}`,
    });
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}
