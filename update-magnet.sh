#!/bin/bash
# Usage: ./update-magnet.sh <INFOHASH>
# Updates gutenberg-magnet.txt with new InfoHash while keeping all 75 trackers

if [ -z "$1" ]; then
    echo "Usage: ./update-magnet.sh <INFOHASH>"
    echo "Example: ./update-magnet.sh 6042fc88ad1609b64ac7d09154e89e23ceb81cd4"
    exit 1
fi

INFOHASH=$1

# Load current magnet link to get tracker list
CURRENT=$(cat poc10/gutenberg-magnet.txt)

# Extract tracker list (everything after first &tr=)
TRACKERS=$(echo "$CURRENT" | grep -oP '&tr=.*')

# Build new magnet link with new InfoHash
NEW_MAGNET="magnet:?xt=urn:btih:${INFOHASH}&dn=gutenberg-txt-files.tar.zip${TRACKERS}"

# Save to file
echo "$NEW_MAGNET" > poc10/gutenberg-magnet.txt

echo "✅ Updated poc10/gutenberg-magnet.txt with InfoHash: $INFOHASH"
echo "📊 Tracker count: $(echo "$TRACKERS" | grep -o '&tr=' | wc -l)"
echo ""
echo "Now run: make deploy"
