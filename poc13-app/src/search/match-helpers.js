const normalize = (value) => (value || '').toString().trim().toLowerCase();

/**
 * Match manifest/library items against a query string.
 * Results are deduplicated by `id` and truncated to the provided limit.
 * @param {string} query
 * @param {object} options
 * @param {Array} options.manifest
 * @param {Array} options.library
 * @param {number} options.limit
 * @param {boolean} options.preferLibrary
 * @returns {Array}
 */
export function matchItemsByQuery(
  query,
  {
    manifest = [],
    library = [],
    catalog = [],
    limit = 20,
    preferLibrary = false,
  } = {},
) {
  const q = normalize(query);
  if (!q) return [];

  const order = preferLibrary
    ? [...library, ...manifest, ...catalog]
    : [...manifest, ...library, ...catalog];
  const seen = new Set();
  const results = [];

  for (const item of order) {
    if (!item || !item.id || seen.has(item.id)) {
      continue;
    }
    const id = normalize(item.id);
    const title = normalize(item.title);
    const author = normalize(item.author);
    const infohash = normalize(item.infohash);

    const matchesId = id && id.includes(q);
    const matchesTitle = title && title.includes(q);
    const matchesAuthor = author && author.includes(q);
    const matchesHash = infohash && infohash.includes(q);

    if (matchesId || matchesTitle || matchesAuthor || matchesHash) {
      results.push(item);
      seen.add(item.id);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export default {
  matchItemsByQuery,
};
