#!/usr/bin/env node

/**
 * Check what peers a tracker sees for a given torrent
 * Usage: node check-tracker.js <infohash|torrent-file>
 */

import WebTorrent from 'webtorrent'
import fs from 'fs'

const input = process.argv[2]

if (!input) {
  console.error('Usage: node check-tracker.js <infohash|torrent-file>')
  console.error('\nExamples:')
  console.error('  node check-tracker.js bbd456a15950aef60ab28e786ae291d00e5fa934')
  console.error('  node check-tracker.js data/mini-gutenberg-10mb.tar.gz.torrent')
  process.exit(1)
}

// Create a WebTorrent client (as a leecher, not a seeder)
const client = new WebTorrent()

let magnetOrBuffer = input

// If it's a file, read it
if (fs.existsSync(input)) {
  console.log(`📄 Reading torrent file: ${input}`)
  magnetOrBuffer = fs.readFileSync(input)
} else if (input.length === 40 && /^[0-9a-f]+$/i.test(input)) {
  // It's an infohash, convert to magnet
  console.log(`🔗 Using infohash: ${input}`)
  magnetOrBuffer = `magnet:?xt=urn:btih:${input}`
} else if (input.startsWith('magnet:')) {
  console.log(`🧲 Using magnet link`)
  magnetOrBuffer = input
} else {
  console.error('❌ Invalid input. Provide an infohash, magnet link, or .torrent file')
  process.exit(1)
}

console.log('\n🔍 Querying trackers...\n')

const torrent = client.add(magnetOrBuffer, {
  announce: [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.fastcast.nz',
  ]
})

let hasMetadata = false
let trackerResponses = new Map()
let foundPeers = new Set()

torrent.on('infoHash', () => {
  console.log(`ℹ️  InfoHash: ${torrent.infoHash}`)
})

torrent.on('metadata', () => {
  hasMetadata = true
  console.log(`✅ Got metadata`)
  console.log(`   Name: ${torrent.name}`)
  console.log(`   Size: ${formatBytes(torrent.length)}`)
  console.log(`   Pieces: ${torrent.pieces.length}`)
})

// Track announces to each tracker
torrent.on('tracker', (announce) => {
  console.log(`\n📡 Tracker: ${announce.announceUrl || 'unknown'}`)
})

torrent.on('warning', (err) => {
  if (err.message && !err.message.includes('tracker')) {
    console.log(`⚠️  Warning: ${err.message}`)
  }
})

torrent.on('error', (err) => {
  console.error(`❌ Error: ${err.message}`)
})

// Listen for peers
torrent.on('peer', (peer) => {
  const peerId = peer.remoteAddress || peer.id
  if (!foundPeers.has(peerId)) {
    foundPeers.add(peerId)
    console.log(`\n👤 Found peer: ${peerId}`)
  }
})

torrent.on('wire', (wire, addr) => {
  console.log(`🔗 Connected to peer: ${addr}`)
})

// Give it some time to query trackers
setTimeout(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`InfoHash: ${torrent.infoHash}`)
  console.log(`Metadata: ${hasMetadata ? '✅ Received' : '❌ Not received'}`)
  console.log(`Trackers: ${torrent.announce ? torrent.announce.length : 0}`)
  console.log(`Peers found: ${foundPeers.size}`)
  console.log(`Peers connected: ${torrent.numPeers}`)

  if (foundPeers.size === 0) {
    console.log('\n⚠️  No peers found!')
    console.log('Possible issues:')
    console.log('  - Seeders not running or not announcing')
    console.log('  - Tracker connectivity issues')
    console.log('  - Wrong infohash')
  } else {
    console.log('\n✅ Tracker has peers!')
  }

  console.log('\n🛑 Stopping...')
  client.destroy(() => {
    process.exit(0)
  })
}, 15000) // Wait 15 seconds for tracker responses

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

console.log('Press Ctrl+C to stop early\n')
