#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const SAMPLE_FILES = [
  { id: 1008, file: 'alice.txt' },
  { id: 1002, file: 'pride.txt' },
  { id: 1005, file: 'dracula.txt' },
  { id: 1010, file: 'sherlock.txt' },
  { id: 1003, file: 'frankenstein.txt' },
  { id: 1009, file: 'alice.txt' },
  { id: 1001, file: 'pride.txt' },
  { id: 1004, file: 'dracula.txt' },
  { id: 1006, file: 'sherlock.txt' },
  { id: 1007, file: 'frankenstein.txt' }
];

const TARGET_BYTES = 1024 * 1024; // ~1 MiB each -> ~10 MiB compressed
const ROOT = path.resolve(__dirname, '..');
const POC1_DIR = path.join(ROOT, 'poc1');
const OUTPUT = path.join(ROOT, 'mini-gutenberg-10mb.tar.gz');

function buildContent(samplePath) {
  const base = fs.readFileSync(samplePath, 'utf-8').replace(/\r\n/g, '\n').trim() + '\n\n';
  const pieces = [];
  let total = 0;
  const chunk = Buffer.from(base, 'utf-8');
  while (total < TARGET_BYTES) {
    pieces.push(chunk);
    total += chunk.length;
  }
  return Buffer.concat(pieces).slice(0, TARGET_BYTES);
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-gutenberg-'));
  try {
    SAMPLE_FILES.forEach(({ id, file }) => {
      const samplePath = path.join(POC1_DIR, file);
      if (!fs.existsSync(samplePath)) {
        throw new Error(`Sample missing: ${samplePath}`);
      }
      const content = buildContent(samplePath);
      const targetDir = path.join(tmpDir, 'cache', 'epub', String(id));
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, `pg${id}.txt`), content);
    });

    const tarResult = spawnSync('tar', ['-czf', OUTPUT, '-C', tmpDir, '.'], { stdio: 'inherit' });
    if (tarResult.status !== 0) {
      throw new Error('tar command failed');
    }
    const sizeMb = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(2);
    console.log(`Created ${OUTPUT} (${sizeMb} MiB)`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main();
}
