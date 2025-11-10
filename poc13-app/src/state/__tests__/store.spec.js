import { describe, expect, test, vi, beforeEach } from 'vitest';

const persistenceMock = vi.hoisted(() => ({
  data: [],
  loadLibraryItems: vi.fn(async () => persistenceMock.data),
  saveLibraryItems: vi.fn(async (items) => {
    persistenceMock.data = items;
  }),
}));

vi.mock('../persistence', () => ({
  loadLibraryItems: persistenceMock.loadLibraryItems,
  saveLibraryItems: persistenceMock.saveLibraryItems,
}));

import * as store from '../store.js';

describe('state/store', () => {
  beforeEach(() => {
    persistenceMock.data = [];
    vi.clearAllMocks();
    store.__resetStore();
  });

  test('initializes with sample manifest', async () => {
    await store.initStore();
    const snapshot = store.getState();
    expect(snapshot.manifest).toHaveLength(5);
    expect(snapshot.library).toEqual([]);
  });

  test('saves and removes library items', async () => {
    await store.initStore();
    const sample = store.getSampleItems(1)[0];
    await store.saveToLibrary(sample);
    expect(store.getState().library).toHaveLength(1);
    await store.removeFromLibrary(sample.id);
    expect(store.getState().library).toHaveLength(0);
  });
});
