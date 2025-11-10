import { createStore, get, set, del } from 'idb-keyval';

const DB_NAME = 'nostr-library-hub';
const STORE_NAME = 'state';
const LIBRARY_KEY = 'library-items';
const KEYPAIR_KEY = 'nostr-keypair';

const idbStore = typeof indexedDB !== 'undefined' ? createStore(DB_NAME, STORE_NAME) : null;
const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeJSON = {
  parse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  stringify(value, fallback = '[]') {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  },
};

const readFromLocalStorage = (key, fallback) => {
  if (!hasLocalStorage) return fallback;
  return safeJSON.parse(window.localStorage.getItem(key), fallback);
};

const writeToLocalStorage = (key, value) => {
  if (!hasLocalStorage) return;
  window.localStorage.setItem(key, safeJSON.stringify(value));
};

const deleteFromLocalStorage = (key) => {
  if (!hasLocalStorage) return;
  window.localStorage.removeItem(key);
};

async function readFromIdb(key, fallback) {
  if (!idbStore) return fallback;
  try {
    const value = await get(key, idbStore);
    return typeof value === 'undefined' ? fallback : value;
  } catch {
    return fallback;
  }
}

async function writeToIdb(key, value) {
  if (!idbStore) return;
  try {
    await set(key, value, idbStore);
  } catch {
    // swallow—callers fall back to localStorage
  }
}

async function deleteFromIdb(key) {
  if (!idbStore) return;
  try {
    await del(key, idbStore);
  } catch {
    // swallow
  }
}

export async function loadLibraryItems() {
  const fallback = readFromLocalStorage(LIBRARY_KEY, []);
  return readFromIdb(LIBRARY_KEY, fallback);
}

export async function saveLibraryItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  writeToLocalStorage(LIBRARY_KEY, safeItems);
  await writeToIdb(LIBRARY_KEY, safeItems);
  return safeItems;
}

export async function clearLibraryItems() {
  deleteFromLocalStorage(LIBRARY_KEY);
  await deleteFromIdb(LIBRARY_KEY);
}

export async function loadKeypair() {
  const fallback = readFromLocalStorage(KEYPAIR_KEY, null);
  return readFromIdb(KEYPAIR_KEY, fallback);
}

export async function saveKeypair(keypair) {
  if (!keypair) return null;
  writeToLocalStorage(KEYPAIR_KEY, keypair);
  await writeToIdb(KEYPAIR_KEY, keypair);
  return keypair;
}

export async function clearKeypair() {
  deleteFromLocalStorage(KEYPAIR_KEY);
  await deleteFromIdb(KEYPAIR_KEY);
}

export const storageKeys = {
  LIBRARY_KEY,
  KEYPAIR_KEY,
};
