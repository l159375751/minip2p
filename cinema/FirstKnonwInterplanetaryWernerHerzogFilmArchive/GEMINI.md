# Directory Overview

This directory, `FirstKnonwInterplanetaryWernerHerzogFilmArchive`, appears to be a project focused on creating a comprehensive archive of Werner Herzog's films. The goal is to gather metadata for each film and potentially make them available for streaming.

## Key Files

*   **`index.txt`**: This file contains a list of Werner Herzog's documentary films, both feature-length and shorts.
*   **`plan`**: This file outlines a plan to collect metadata for each movie. The desired information includes:
    *   IMDB ID
    *   Rotten Tomatoes ID
    *   Title
    *   Summary
    *   Media file information (length, year, description)
    *   Language information (audio and subtitles)
    The plan also mentions [WebTor](https://www.reddit.com/r/opensource/comments/1jpjl5b/webtor_opensource_torrent_streaming_engine/), an open-source torrent streaming engine, suggesting that the project may involve streaming the films.
*   **`components`**: This file outlines the desired components for the project:
    *   A minimal WebTorrent client.
    *   A minimal profile/collection with Nostr sync, source of metadata, and infohash.
    *   A minimal WebTorrent media player/video player in the browser to live stream/show movies from the collection.
*   **`data/`**: This directory is also empty, but it is likely intended to store the collected metadata for the films.

## Usage

The contents of this directory are intended to be used to build a database and potentially a streaming service for Werner Herzog's films. The `plan` file provides a roadmap for collecting the necessary information.
