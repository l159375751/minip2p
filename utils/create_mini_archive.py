#!/usr/bin/env python3
"""Build trimmed Gutenberg tarballs from the full archive using system tar.

Usage:
    python3 utils/create_mini_archive.py          # builds 10mb/100mb/1000mb bundles
    SAMPLE=10mb python3 utils/create_mini_archive.py
    SAMPLE=sha python3 utils/create_mini_archive.py
"""

from __future__ import annotations

import os
import sys
import tempfile
import subprocess
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
OUTPUT_DIR = Path(os.environ.get('OUTPUT_DIR', DATA_DIR)).expanduser()
FULL_ARCHIVE = DATA_DIR / 'gutenberg-txt-files.tar.gz'

# Build cascading archives: each is 1/10 of previous
# 1000mb from full → 100mb from 1000mb → 10mb from 100mb
TARGETS = {
    '1000mb': {'source': FULL_ARCHIVE, 'fraction': 0.1},
    '100mb': {'source': None, 'fraction': 0.1},  # from 1000mb
    '10mb': {'source': None, 'fraction': 0.1},   # from 100mb
}
DEFAULT_BUILD_ORDER = ['1000mb', '100mb', '10mb']
SAMPLE_ALIASES = {
    'demo': '10mb',
    '100': '100mb',
    '1k': '1000mb',
    '10k': '1000mb',
    'all': 'all'
}


def ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def ensure_full_archive() -> None:
    if not FULL_ARCHIVE.exists():
        raise FileNotFoundError(
            f'Expected {FULL_ARCHIVE.name} under data/, run "make convert-to-targz" first.'
        )


def resolve_sample(mode: str) -> str:
    canonical = SAMPLE_ALIASES.get(mode, mode)
    if canonical == 'all':
        return canonical
    if canonical not in TARGETS:
        available = ', '.join(sorted(TARGETS))
        raise ValueError(f"Unknown sample '{mode}'. Choose from {available}, or 'all'.")
    return canonical


def list_tar_files(archive_path: Path) -> list[str]:
    """List all files (not directories) from a tar.gz, sorted."""
    result = subprocess.run(
        ['tar', '-tzf', str(archive_path)],
        capture_output=True, text=True, check=True
    )
    # Filter out directories (ending with /)
    files = [line for line in result.stdout.splitlines() if not line.endswith('/')]
    return sorted(files)


def run_tar(args: list[str]) -> None:
    result = subprocess.run(['tar', *args], capture_output=True, text=True)
    allow_fail = '--ignore-failed-read' in args
    if result.returncode != 0 and not allow_fail:
        raise RuntimeError(f"tar {' '.join(args)} failed:\n{result.stderr}")
    if result.returncode != 0 and allow_fail:
        sys.stderr.write(result.stderr)


def write_list_file(paths: list[str]) -> Path:
    with tempfile.NamedTemporaryFile('w', delete=False, encoding='utf-8') as handle:
        for path in paths:
            handle.write(f"{path}\n")
        return Path(handle.name)


def compute_sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    hasher = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def write_sha256(path: Path) -> str:
    digest = compute_sha256(path)
    sha_path = Path(f'{path}.sha256')
    sha_path.write_text(f'{digest}  {path.name}\n', encoding='utf-8')
    return digest


# Checksums stored alongside archives as *.tar.gz.sha256


def update_existing_hashes() -> None:
    ensure_output_dir()
    archives = sorted(OUTPUT_DIR.glob('mini-gutenberg-*.tar.gz'))
    if not archives:
        print('No mini-gutenberg archives found to hash.', file=sys.stderr)
        sys.exit(1)
    for archive in archives:
        digest = write_sha256(archive)
        record_checksum(archive, digest)
        print(f'Updated {archive.name}.sha256 -> {digest}')


def build_archives(samples: list[str]) -> None:
    if not samples:
        return

    ensure_output_dir()
    ensure_full_archive()

    # Build in cascading order: 1000mb → 100mb → 10mb
    # Each archive is a subset of the previous one
    for sample in samples:
        resolved = resolve_sample(sample)
        if resolved == 'all':
            raise ValueError('Use "all" only as a top-level mode.')
        if resolved not in TARGETS:
            print(f'⚠️  Unknown sample: {resolved}')
            continue

        config = TARGETS[resolved]
        fraction = config['fraction']

        # Determine source archive
        if resolved == '1000mb':
            source_archive = FULL_ARCHIVE
        elif resolved == '100mb':
            source_archive = OUTPUT_DIR / 'mini-gutenberg-1000mb.tar.gz'
        elif resolved == '10mb':
            source_archive = OUTPUT_DIR / 'mini-gutenberg-100mb.tar.gz'
        else:
            print(f'⚠️  Unknown cascade for {resolved}')
            continue

        if not source_archive.exists():
            print(f'⚠️  Source archive missing: {source_archive.name}')
            continue

        # List all files from source, sorted
        all_files = list_tar_files(source_archive)
        if not all_files:
            print(f'⚠️  No files found in {source_archive.name}')
            continue

        # Take first N files based on fraction
        num_files = int(len(all_files) * fraction)
        if num_files == 0:
            num_files = min(100, len(all_files))  # at least 100 files
        selected_files = all_files[:num_files]

        print(f'Building {resolved}: {len(selected_files)} of {len(all_files)} files from {source_archive.name}')

        # Extract selected files to temp, then repackage
        with tempfile.TemporaryDirectory(prefix=f'mini-gutenberg-{resolved}-') as tmp:
            staging_root = Path(tmp) / 'extract'
            staging_root.mkdir(parents=True, exist_ok=True)

            # Write file list
            list_file = write_list_file(selected_files)
            try:
                # Extract from source
                run_tar([
                    '-xzf', str(source_archive),
                    '-C', str(staging_root),
                    '--files-from', str(list_file)
                ])
            finally:
                try:
                    list_file.unlink()
                except FileNotFoundError:
                    pass

            # Create output archive
            output = OUTPUT_DIR / f'mini-gutenberg-{resolved}.tar.gz'
            run_tar([
                '-czf', str(output),
                '-C', str(staging_root),
                '.'
            ])

            size_mb = output.stat().st_size / (1024 * 1024)
            digest = write_sha256(output)

            print(f'Created {output.name} (~{size_mb:.2f} MiB).')
            print(f'SHA256: {digest}')


def main() -> None:
    mode = os.environ.get('SAMPLE', 'all').strip().lower()
    if not mode:
        mode = 'all'

    if mode in {'sha', 'sha256', 'hash'}:
        update_existing_hashes()
        return

    resolved_mode = resolve_sample(mode)
    if resolved_mode == 'all':
        build_archives(DEFAULT_BUILD_ORDER)
    else:
        build_archives([resolved_mode])


if __name__ == '__main__':
    main()
