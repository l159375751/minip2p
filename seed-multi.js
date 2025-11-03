#!/usr/bin/env node

/**
 * Seed multiple torrents from a list of magnet links or infohashes
 * Usage: node seed-multi.js [torrents.txt] [trackers.txt]
 */

import WebTorrent from 'webtorrent'
import fs from 'fs'
import path from 'path'

// Default trackers applied when no tracker file is provided
const FALLBACK_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonoid.ch:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce'
]

// Read torrents file
const torrentsFile = process.argv[2] || 'torrents.txt'
const trackersArg = process.argv[3] || null

if (!fs.existsSync(torrentsFile)) {
  console.error(`❌ File not found: ${torrentsFile}`)
  console.log(`\nCreate ${torrentsFile} with one magnet link or infohash per line.`) // Corrected: \n to 

  process.exit(1)
}

const content = fs.readFileSync(torrentsFile, 'utf8')
const lines = content.split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))

if (lines.length === 0) {
  console.error(`❌ No torrents found in ${torrentsFile}`)
  console.log(`\nAdd magnet links or infohashes to ${torrentsFile}, one per line.`) // Corrected: \n to 

  process.exit(1)
}

console.log(`📋 Found ${lines.length} torrent(s) to seed\n`)

const { trackers, source: trackerSource } = loadTrackerList({
  trackersArg,
  torrentsFile
})

if (trackerSource) {
  console.log(`📡 Using ${trackers.length} tracker(s) from ${trackerSource}`)
} else {
  console.log(`📡 Using built-in tracker list (${trackers.length} total)`)
}

// Create WebTorrent client
const client = new WebTorrent({
  maxConns: 200,
  dht: true,
  lsd: true,
  utp: true
})

client.on('error', err => {
  console.error('❌ Client error:', err.message)
})

// Convert infohash to magnet link
function toMagnetLink(input, trackerList) {
  if (input.startsWith('magnet:')) {
    return input
  }

  // Assume it's an infohash
  const infohash = input.toLowerCase().replace(/[^a-f0-9]/g, '')

  if (infohash.length !== 40) {
    console.error(`⚠️  Invalid infohash length (${infohash.length}): ${input}`)
    return null
  }

  // Build magnet link with trackers
  const trackerParams = trackerList.map(t => `&tr=${encodeURIComponent(t)}`).join('')
  return `magnet:?xt=urn:btih:${infohash}${trackerParams}`
}

// Seed each torrent
let activeTorrents = 0

lines.forEach((line, idx) => {
  const magnetLink = toMagnetLink(line, trackers)

  if (!magnetLink) {
    return
  }

  console.log(`\n[${idx + 1}/${lines.length}] Adding torrent...`)
  console.log(`🔗 ${magnetLink.substring(0, 80)}...`)


  // Add magnet link with path to seed local files
  const torrent = client.add(magnetLink, { path: '/data' })

  activeTorrents++

  torrent.on('infoHash', () => {
    console.log(`   ℹ️  InfoHash: ${torrent.infoHash}`)
  })

  torrent.on('metadata', () => {
    console.log(`   ✅ Got metadata for: ${torrent.name}`)
    console.log(`   📊 Size: ${formatBytes(torrent.length)}`)
    console.log(`   🧩 Pieces: ${torrent.pieces.length}`)
  })

  torrent.on('ready', () => {
    console.log(`   🌱 Seeding: ${torrent.name}`)
  })

  torrent.on('wire', (wire, addr) => {
    console.log(`   🔗 Peer connected to ${torrent.name ? torrent.name.substring(0, 30) : torrent.infoHash}: ${addr}`)
  })

  torrent.on('error', err => {
    console.error(`   ❌ Error with ${torrent.infoHash}:`, err.message)
    activeTorrents--
  })
})

// Status update every 30 seconds
setInterval(() => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 Status: ${activeTorrents} active torrent(s)`)

  client.torrents.forEach(torrent => {
    const progress = Math.round(torrent.progress * 100)
    const peers = torrent.numPeers
    const downSpeed = formatBytes(torrent.downloadSpeed)
    const upSpeed = formatBytes(torrent.uploadSpeed)
    const uploaded = formatBytes(torrent.uploaded)

    console.log(`\n   📦 ${torrent.name || torrent.infoHash}`)
    console.log(`      Progress: ${progress}% | Peers: ${peers}`)
    console.log(`      ⬇️  ${downSpeed}/s | ⬆️  ${upSpeed}/s | Total uploaded: ${uploaded}`)
  })

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}, 300000)

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function loadTrackerList({ trackersArg, torrentsFile }) {
  const fallback = {
    trackers: [...FALLBACK_TRACKERS],
    source: null
  }

  const candidates = []

  if (trackersArg) {
    candidates.push(trackersArg)
  } else {
    const colocated = path.join(path.dirname(torrentsFile), 'trackers.txt')
    candidates.push(colocated)
    if (path.resolve(colocated) !== path.resolve('trackers.txt')) {
      candidates.push('trackers.txt')
    }
  }

  for (const candidate of [...new Set(candidates)]) {
    if (!candidate) continue

    if (!fs.existsSync(candidate)) {
      if (trackersArg) {
        console.warn(`⚠️  Provided trackers file not found: ${candidate}`)
      }
      continue
    }

    const data = fs.readFileSync(candidate, 'utf8')
    const entries = data.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))

    if (entries.length === 0) {
      console.warn(`⚠️  No trackers found in ${candidate} (all lines empty or comments)`)
      continue
    }

    return {
      trackers: Array.from(new Set(entries)),
      source: candidate
    }
  }

  return fallback
}

console.log(`\n🌱 WebTorrent Multi-Seeder started!`)
console.log(`Press Ctrl+C to stop seeding\n`)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...')
  client.destroy(() => {
    console.log('✅ All torrents stopped')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down...')
  client.destroy(() => {
    console.log('✅ All torrents stopped')
    process.exit(0)
  })
})
