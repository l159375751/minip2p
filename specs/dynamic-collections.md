# Dynamic Collection Discovery via Nostr

## Problem

Currently, torrent collections (WHDA, BLNR) are hardcoded in `relaylog.html`. This makes the UI confusing and limits extensibility. Collections should be discovered dynamically from Nostr messages.

## Solution

Use Nostr events to advertise and discover torrent collections. The relay log UI automatically learns about available collections and builds the UI dynamically.

---

## Nostr Event Structure

### Collection Advertisement (kind:30317)

Each collection is published as a replaceable event (kind:30317) with:

```json
{
  "kind": 30317,
  "tags": [
    ["d", "WHDA"],              // Collection ID (unique identifier)
    ["title", "Werner Herzog Documentary Archive"],  // Human-readable name
    ["description", "Collection of Herzog documentaries"],
    ["t", "cinema"],
    ["t", "herzog"]
  ],
  "content": "{\"items\":[{\"infohash\":\"...\",\"title\":\"...\"}]}"
}
```

**Required tags:**
- `d` - Collection ID (short, uppercase identifier like WHDA, BLNR)
- `title` - Human-readable collection name

**Optional tags:**
- `description` - What this collection contains
- `t` - Topic tags for categorization
- `client` - Publishing client name

**Content:**
JSON object with `items` array containing infohash/title pairs.

---

## Implementation Changes

### 1. relaylog.html Changes

#### On Connect:
1. Subscribe to kind:30317 events (all collections)
2. When receiving kind:30317 events:
   - Extract `d` tag as collection ID
   - Extract `title` tag (or fallback to `d` value)
   - Store in `discoveredCollections` map
   - Rebuild collection dropdown

#### Collection Storage:
```javascript
let discoveredCollections = new Map();
// Map structure: { "WHDA": { title: "Werner Herzog...", data: {...} }, ... }
```

#### UI Updates:
```javascript
function rebuildCollectionDropdown() {
  const select = document.getElementById('collectionSelect');
  select.innerHTML = '';

  for (const [id, info] of discoveredCollections) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${id} - ${info.title}`;
    select.appendChild(option);
  }

  // Add fallback if no collections discovered
  if (discoveredCollections.size === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '(No collections found)';
    select.appendChild(option);
  }
}
```

#### Remove Hardcoded Collections:
- Delete `DEFAULT_PAYLOADS` object
- Remove hardcoded WHDA/BLNR options from HTML

### 2. Publishing Collections

#### Initial Seeding:
Create a script or manual process to publish the initial WHDA and BLNR collections to the relay.

Example publishing code:
```javascript
async function publishCollection(relay, sk, collectionId, title, items) {
  const event = {
    kind: 30317,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', collectionId],
      ['title', title],
      ['t', 'cinema'],
      ['client', 'minip2p-seeder']
    ],
    content: JSON.stringify({ items })
  };

  const signed = NostrTools.finalizeEvent(event, sk);
  await relay.publish(signed);
}
```

### 3. Fallback Behavior

If no collections are discovered:
- Show "(No collections found)" in dropdown
- Disable "Create new" and "Publish" actions
- "Load latest" can still attempt to fetch

---

## Migration Path

1. **Phase 1**: Add collection discovery to relaylog.html while keeping hardcoded fallbacks
2. **Phase 2**: Publish WHDA and BLNR collections to relay.0x6d.net
3. **Phase 3**: Remove hardcoded collections from relaylog.html
4. **Phase 4**: Create admin/seeder tool for publishing collections

---

## Benefits

- Collections are decentralized and discoverable
- Anyone can publish new collections
- UI adapts automatically to available collections
- Consistent with Nostr philosophy
- Easy to extend with new collection types

---

## Open Questions

1. Should there be a "default" collection if none are discovered?
2. How to handle collection conflicts (same `d` tag from different pubkeys)?
   - Option A: First-seen wins
   - Option B: Trust a specific pubkey
   - Option C: Show all and let user choose
3. Should we cache discovered collections in localStorage?

---

## Files to Modify

- `helpers/relaylog.html` - Add collection discovery, remove hardcoded lists
- `seed-multi.js` or new script - Publish initial collections to relay
- `cinema/infohash-*.txt` - Keep as reference but not hardcoded in UI

---

## Testing

1. Start relay.0x6d.net
2. Publish test collection via relaylog editor
3. Reload page
4. Verify collection appears in dropdown
5. Verify can load/edit/publish discovered collection
