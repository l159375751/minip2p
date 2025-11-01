#!/usr/bin/env node

/**
 * Build a mini Gutenberg archive (~10 MB) using real sample texts.
 * Copies data from poc1's sample files and repeats them to reach ~1 MB per entry.
 *
 * Output: mini-gutenberg-10mb.tar.gz in repo root (ignored via .gitignore)
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');
const tar = require('tar-stream');

const SAMPLE_FILES = [
  { id: 11, title: "Alice's Adventures in Wonderland", file: 'alice.txt' },
  { id: 1342, title: 'Pride and Prejudice', file: 'pride.txt' },
  { id: 84, title: 'Frankenstein', file: 'frankenstein.txt' },
  { id: 345, title: 'Dracula', file: 'dracula.txt' },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', file: 'sherlock.txt' },
  { id: 2701, title: 'Moby Dick', file: 'dracula.txt' }, // reuse when samples limited
  { id: 98, title: 'Tale of Two Cities', file: 'pride.txt' },
  { id: 1232, title: 'The Jungle Book', file: 'alice.txt' },
  { id: 1184, title: 'The Odyssey', file: 'frankenstein.txt' },
  { id: 2542, title: 'A Room with a View', file: 'sherlock.txt' }
];

const TARGET_KB = 1024; // ~1 MiB per entry
const OUTPUT = path.resolve(process.cwd(), 'mini-gutenberg-10mb.tar.gz');
const POC1_DIR = path.resolve(__dirname, '..', 'poc1');

function loadSample(fileName) {
  const filePath = path.join(POC1_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Sample file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function buildContent(baseText, targetBytes) {
  const normalized = baseText.replace(/\r\n/g, '\n').trim() + '\n\n';
  const buffer = [];
  while (Buffer.byteLength(buffer.join('')) < targetBytes) {
    buffer.push(normalized);
  }
  return buffer.join('').slice(0, targetBytes);
}

async function main() {
  const pack = tar.pack();

  SAMPLE_FILES.forEach(({ id, title, file }) => {
    const baseText = loadSample(file);
    const targetBytes = TARGET_KB * 1024;
    const augmented = [
      `${title}`,
      `by Sample Gutenberg Author`,
      '',
      buildContent(baseText, targetBytes)
    ].join('\n');

    const filePath = `cache/epub/${id}/pg${id}.txt`;
    pack.entry({ name: filePath }, augmented);
  });

  pack.finalize();

  const chunks = [];
  for await (const chunk of pack) {
    chunks.push(chunk);
  }

  const tarBuffer = Buffer.concat(chunks);
  const gz = gzipSync(tarBuffer, { level: 9 });
  fs.writeFileSync(OUTPUT, gz);

  console.log(`Created ${OUTPUT} (${(gz.length / (1024 * 1024)).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error('Failed to build mini archive:', err);
  process.exit(1);
});
