#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'mini-gutenberg-10mb.tar.gz');
const FULL_ARCHIVE = path.join(ROOT, 'gutenberg-txt-files.tar.gz');
const TARGET_FILES = 100;

function runCommand(command, options = {}) {
  const result = spawnSync('sh', ['-c', command], { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50, ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command}`);
  }
  return result.stdout;
}

function runTarArgs(args, options = {}) {
  const result = spawnSync('tar', args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`tar ${args.join(' ')} failed with code ${result.status}`);
  }
}

function selectEntries() {
  const list = runCommand(`tar -tzf "${FULL_ARCHIVE}" | head -n 500`);
  const entries = list
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.txt'));

  const unique = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!seen.has(entry)) {
      unique.push(entry);
      seen.add(entry);
    }
    if (unique.length === TARGET_FILES) break;
  }

  if (unique.length < TARGET_FILES) {
    throw new Error(`Expected at least ${TARGET_FILES} .txt files, found ${unique.length}`);
  }

  return unique;
}

function main() {
  if (!fs.existsSync(FULL_ARCHIVE)) {
    throw new Error(`Cannot find full archive: ${FULL_ARCHIVE}`);
  }

  const entries = selectEntries();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-gutenberg-'));

  try {
    runTarArgs(['-xzf', FULL_ARCHIVE, '-C', tmpDir, ...entries]);
    runTarArgs(['-czf', OUTPUT, '-C', tmpDir, '.']);
    const sizeMb = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(2);
    console.log(`Created ${OUTPUT} (${sizeMb} MiB) using entries:`);
    entries.forEach((entry) => console.log(` - ${entry}`));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main();
}
