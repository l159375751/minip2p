import { getState } from '@/state/store';

const searchState = {
  query: '',
  results: [],
  listeners: new Set(),
};

function notify() {
  const snapshot = { query: searchState.query, results: searchState.results };
  searchState.listeners.forEach((fn) => fn(snapshot));
}

export function subscribeSearch(listener) {
  searchState.listeners.add(listener);
  listener({ query: searchState.query, results: searchState.results });
  return () => searchState.listeners.delete(listener);
}

export function updateQuery(query) {
  searchState.query = query;
  performSearch();
}

function normalize(str) {
  return (str || '').toLowerCase();
}

function performSearch() {
  const q = normalize(searchState.query);
  if (!q) {
    searchState.results = [];
    notify();
    return;
  }

  const state = getState();
  const haystack = [...state.manifest, ...state.library];

  const unique = new Map();
  haystack.forEach((item) => {
    if (unique.has(item.id)) return;
    const title = normalize(item.title);
    const author = normalize(item.author);
    const infohash = normalize(item.infohash);
    if (title.includes(q) || author.includes(q) || infohash.includes(q)) {
      unique.set(item.id, item);
    }
  });

  searchState.results = Array.from(unique.values()).slice(0, 20);
  notify();
}

export function clearSearch() {
  searchState.query = '';
  searchState.results = [];
  notify();
}
