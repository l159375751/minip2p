import { describe, expect, it } from 'vitest';
import { matchItemsByQuery } from '../match-helpers';

const manifest = [
  { id: 'g-1', title: 'Dracula', author: 'Bram Stoker', infohash: 'hash-dracula' },
  { id: 'g-2', title: 'Frankenstein', author: 'Mary Shelley', infohash: 'hash-frank' },
  { id: 'g-3', title: 'Sherlock Holmes', author: 'Arthur Conan Doyle', infohash: 'hash-sherlock' },
];

const library = [
  { id: 'g-1', title: 'Dracula (annotated)', author: 'Bram Stoker', infohash: 'hash-dracula', fromLibrary: true },
  { id: 'g-99', title: 'Custom Zine', author: 'Indie Author', infohash: 'hash-zine' },
];

describe('matchItemsByQuery', () => {
  it('returns empty array for blank queries', () => {
    expect(matchItemsByQuery('', { manifest, library })).toEqual([]);
    expect(matchItemsByQuery('   ', { manifest, library })).toEqual([]);
  });

  it('prefers library entries when requested and dedupes by id', () => {
    const results = matchItemsByQuery('dracula', {
      manifest,
      library,
      preferLibrary: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0].fromLibrary).toBe(true);
  });

  it('matches by title, author, id, or infohash', () => {
    const byInfohash = matchItemsByQuery('hash-sher', { manifest, library });
    expect(byInfohash).toHaveLength(1);
    expect(byInfohash[0].id).toBe('g-3');

    const byAuthor = matchItemsByQuery('mary', { manifest, library });
    expect(byAuthor).toHaveLength(1);
    expect(byAuthor[0].id).toBe('g-2');
  });

  it('applies the limit cap', () => {
    const largeManifest = Array.from({ length: 10 }).map((_, idx) => ({
      id: `id-${idx}`,
      title: `Book ${idx}`,
      author: 'Anon',
      infohash: `hash-${idx}`,
    }));
    const capped = matchItemsByQuery('book', { manifest: largeManifest, limit: 3 });
    expect(capped).toHaveLength(3);
  });
});
