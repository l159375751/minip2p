import { getState } from '@/state/store';
import { initNostrClient, sendSearchRequest, subscribeToSearchResults } from '@/nostr/client';
import { matchItemsByQuery } from './match-helpers';

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

let remoteSubscriptionCleanup = null;
let fallbackTimer = null;

export function updateQuery(query) {
  searchState.query = query;
  searchState.results = [];
  notify();

  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }

  if (!query.trim()) {
    return;
  }

  sendSearchRequest(query.trim());
  fallbackTimer = setTimeout(() => {
    if (searchState.results.length === 0) {
      searchState.results = localFallback(query);
      notify();
    }
  }, 800);
}

function normalize(str) {
  return (str || '').toLowerCase();
}

function localFallback(query) {
  const state = getState();
  return matchItemsByQuery(query, {
    manifest: state.manifest,
    library: state.library,
    limit: 20,
    preferLibrary: true,
  });
}

export function clearSearch() {
  searchState.query = '';
  searchState.results = [];
  notify();
}

function handleRemoteResult(payload) {
  if (!payload) return;
  if (searchState.query && payload.query && normalize(payload.query) !== normalize(searchState.query)) {
    return;
  }
  const exists = searchState.results.some((item) => item.id === payload.id);
  if (exists) return;
  searchState.results = [...searchState.results, payload];
  notify();
}

function init() {
  initNostrClient();
  remoteSubscriptionCleanup = subscribeToSearchResults(handleRemoteResult);
}

init();
