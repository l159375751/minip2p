#!/usr/bin/env node

/**
 * Create torrent files (and magnet URIs) for local assets.
 *
 * Usage:
 *   node utils/create_torrent.js <input-path> [output-dir] [trackers.txt]
 *
 * The script writes <basename>.torrent into the output directory and prints
 * the announce list and magnet URI to stdout.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const FALLBACK_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'udp://tracker.opentrackr.org:1337',
  'udp://open.demonoid.ch:6969',
  'udp://tracker.torrent.eu.org:451',
  'udp://exodus.desync.com:6969'
]

async function main() {
    const args = process.argv.slice(2)

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        printUsage()
        process.exit(args.length === 0 ? 1 : 0)
    }

    const inputPath = path.resolve(args[0])
    const outputDir = path.resolve(args[1] || path.dirname(inputPath))
    const trackersPath = args[2] ? resolveTrackerPath(args[2]) : path.resolve(process.cwd(), 'trackers.txt')

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input path not found: ${inputPath}`)
        process.exit(1)
    }

    if (!fs.statSync(inputPath).isFile()) {
        console.error(`❌ Only single-file torrents are supported (got directory): ${inputPath}`)
        process.exit(1)
    }

    const trackers = loadTrackers(trackersPath)
    await fs.promises.mkdir(outputDir, { recursive: true })

    const torrentBuffer = await buildTorrent(inputPath, trackers)
    const torrentName = `${path.basename(inputPath)}.torrent`
    const outPath = path.join(outputDir, torrentName)
    await fs.promises.writeFile(outPath, torrentBuffer)

    const infoSection = extractInfoSection(torrentBuffer)
    const infoHash = crypto.createHash('sha1').update(infoSection).digest('hex')
    const magnet = buildMagnet(infoHash, path.basename(inputPath), trackers)

    console.log(`📦  ${path.basename(inputPath)} (${formatBytes(fs.statSync(inputPath).size)})`)
    console.log(`🧲  ${magnet}`)
    console.log(`📝  Wrote torrent: ${outPath}`)
}

function printUsage() {
    console.log(`Usage:
  node utils/create_torrent.js <input-path> [output-dir] [trackers.txt]

Examples:
  node utils/create_torrent.js data/mini-gutenberg-10mb.tar.gz
  node utils/create_torrent.js ~/archives/bundle.tar.gz torrents trackers.txt`)
}

function resolveTrackerPath(userProvided) {
    if (path.isAbsolute(userProvided)) {
        return userProvided
    }
    const relative = path.resolve(process.cwd(), userProvided)
    if (fs.existsSync(relative)) {
        return relative
    }
    const scriptDir = path.dirname(fileURLToPath(import.meta.url))
    const adjacent = path.resolve(scriptDir, '..', userProvided)
    if (fs.existsSync(adjacent)) {
        return adjacent
    }
    return userProvided
}

function loadTrackers(trackersPath) {
    if (fs.existsSync(trackersPath)) {
        const content = fs.readFileSync(trackersPath, 'utf8')
        const entries = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))

        if (entries.length > 0) {
            return Array.from(new Set(entries))
        }

        console.warn(`⚠️  No trackers found in ${trackersPath} (using fallback list)`)
    } else if (trackersPath) {
        console.warn(`⚠️  Trackers file not found (${trackersPath}), using fallback list`)
    }

    return [...FALLBACK_TRACKERS]
}

async function buildTorrent(filePath, trackers) {
    const fileStats = await fs.promises.stat(filePath)
    const pieceLength = choosePieceLength(fileStats.size)
    const pieces = await hashPieces(filePath, pieceLength)
    const info = {
        name: path.basename(filePath),
        length: fileStats.size,
        'piece length': pieceLength,
        pieces
    }

    const torrent = {
        announce: trackers[0],
        'announce-list': trackers.map(t => [t]),
        'creation date': Math.floor(Date.now() / 1000),
        'created by': 'miniP2P toolkit',
        info
    }

    return bencode(torrent)
}

function choosePieceLength(fileSize) {
    const minPiece = 64 * 1024
    const maxPiece = 4 * 1024 * 1024
    let piece = minPiece

    while (fileSize / piece > 2048 && piece < maxPiece) {
        piece *= 2
    }

    return piece
}

async function hashPieces(filePath, pieceLength) {
    const readStream = fs.createReadStream(filePath, { highWaterMark: pieceLength })
    const hashes = []
    let buffer = Buffer.alloc(0)

    for await (const chunk of readStream) {
        buffer = Buffer.concat([buffer, chunk])

        while (buffer.length >= pieceLength) {
            const piece = buffer.subarray(0, pieceLength)
            hashes.push(crypto.createHash('sha1').update(piece).digest())
            buffer = buffer.subarray(pieceLength)
        }
    }

    if (buffer.length > 0) {
        hashes.push(crypto.createHash('sha1').update(buffer).digest())
    }

    return Buffer.concat(hashes)
}

function bencode(value) {
    if (Buffer.isBuffer(value)) {
        return Buffer.concat([Buffer.from(`${value.length}:`), value])
    }

    if (typeof value === 'string') {
        const buf = Buffer.from(value, 'utf8')
        return Buffer.concat([Buffer.from(`${buf.length}:`), buf])
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error(`Cannot bencode non-finite number: ${value}`)
        }
        return Buffer.from(`i${Math.trunc(value)}e`)
    }

    if (Array.isArray(value)) {
        const parts = [Buffer.from('l')]
        value.forEach(item => parts.push(bencode(item)))
        parts.push(Buffer.from('e'))
        return Buffer.concat(parts)
    }

    if (value && typeof value === 'object') {
        const parts = [Buffer.from('d')]
        Object.keys(value).sort().forEach(key => {
            parts.push(bencode(key))
            parts.push(bencode(value[key]))
        })
        parts.push(Buffer.from('e'))
        return Buffer.concat(parts)
    }

    throw new Error(`Cannot bencode value of type: ${typeof value}`)
}

function extractInfoSection(torrentBuffer) {
    // simple parser to isolate the info dictionary for hashing
    // assumes top-level structure is { ... 'info': <dict> ... }
    const str = torrentBuffer.toString('binary')
    const infoIndex = str.indexOf('4:info')
    if (infoIndex === -1) {
        throw new Error('Malformed torrent: missing info dictionary')
    }

    let depth = 0
    let start = infoIndex + '4:info'.length
    if (str[start] !== 'd') {
        throw new Error('Malformed torrent: info dictionary must start with "d"')
    }

    let i = start
    do {
        const char = str[i]
        if (char === 'd' || char === 'l') {
            depth++
            i++
        } else if (char === 'e') {
            depth--
            i++
        } else if (char === 'i') {
            const end = str.indexOf('e', i)
            i = end + 1
        } else if (/\d/.test(char)) {
            const colon = str.indexOf(':', i)
            const length = parseInt(str.substring(i, colon), 10)
            i = colon + 1 + length
        } else {
            throw new Error('Malformed torrent: unexpected token inside info dictionary')
        }
    } while (depth > 0 && i < str.length)

    if (depth !== 0) {
        throw new Error('Malformed torrent: unterminated info dictionary')
    }

    return torrentBuffer.subarray(start, i)
}

function buildMagnet(infoHash, name, trackers) {
    const trackerParams = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('')
    return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}${trackerParams}`
}

function formatBytes(bytes) {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unit = 0
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit++
    }
    return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}

main().catch(err => {
    console.error('❌ Failed to create torrent:', err.message)
    process.exit(1)
})
