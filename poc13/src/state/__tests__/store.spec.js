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

describe('state/store', () => {
  beforeEach(() => {
    persistenceMock.data = [];
    vi.clearAllMocks();
  });

  test('initializes with sample manifest', async () => {
    const store = await import(new URL('../store.js', import.meta.url));
    store.__resetStore();
    await store.initStore();
    const snapshot = store.getState();
    expect(snapshot.manifest).toHaveLength(5);
    expect(snapshot.library).toEqual([]);
  });

  test('saves and removes library items', async () => {
    const store = await import(new URL('../store.js', import.meta.url));
    store.__resetStore();
    await store.initStore();
    const sample = store.getSampleItems(1)[0];
    await store.saveToLibrary(sample);
    expect(store.getState().library).toHaveLength(1);
    await store.removeFromLibrary(sample.id);
    expect(store.getState().library).toHaveLength(0);
  });
});
