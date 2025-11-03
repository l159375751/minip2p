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
CHECKSUM_DIR = ROOT / 'checksums'

# Approximate samplers by target archive size (MB scale)
TARGETS = {
    '10mb': {
        'ids': [
            11, 27, 35, 45, 84, 98, 115, 118, 120, 123, 345, 430, 492, 514, 768,
            907, 1076, 1184, 1232, 1342, 1514, 1661, 1952, 2350, 2542, 2638, 2701,
            3186, 4020, 4230, 4276, 4363, 4432, 4746, 5200, 5300, 5400, 5500, 5600
        ]
    },
    '100mb': {
        'range': (1, 801)  # first ~800 books, missing entries skipped
    },
    '1000mb': {
        'range': (1, 6001)  # first ~6000 books, missing entries skipped
    },
}
DEFAULT_BUILD_ORDER = list(TARGETS.keys())
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


def build_id_list(mode: str) -> list[int]:
    canonical = resolve_sample(mode)
    if canonical == 'all':
        raise ValueError('Cannot build id list for "all" directly.')

    config = TARGETS[canonical]
    if 'ids' in config:
        return config['ids']

    start, end = config['range']
    return list(range(start, end))


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


def record_checksum(archive_path: Path, digest: str) -> None:
    CHECKSUM_DIR.mkdir(parents=True, exist_ok=True)
    checksum_path = CHECKSUM_DIR / f'{archive_path.name}.sha256'
    checksum_path.write_text(f'{digest}\n', encoding='utf-8')


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


def build_mini_archive(mode: str) -> None:
    canonical = resolve_sample(mode)
    if canonical == 'all':
        raise ValueError('Use "all" only as a top-level mode.')

    ensure_output_dir()
    ensure_full_archive()
    etext_ids = build_id_list(canonical)
    output = OUTPUT_DIR / f'mini-gutenberg-{canonical}.tar.gz'

    with tempfile.TemporaryDirectory(prefix='mini-gutenberg-') as tmp:
        tmp_path = Path(tmp)
        extract_dir = tmp_path / 'extract'
        extract_dir.mkdir()

        initial_list = [f'cache/epub/{etext_id}/pg{etext_id}.txt' for etext_id in etext_ids]
        list_file = write_list_file(initial_list)
        try:
            run_tar(['-xzf', str(FULL_ARCHIVE), '-C', str(extract_dir), '--ignore-failed-read', '--files-from', str(list_file)])
        finally:
            try:
                list_file.unlink()
            except FileNotFoundError:
                pass

        extracted_paths = sorted(path.relative_to(extract_dir) for path in extract_dir.glob('cache/epub/*/pg*.txt'))
        if not extracted_paths:
            raise FileNotFoundError('No matching entries were extracted from the archive.')

        second_list_file = write_list_file([str(path) for path in extracted_paths])
        try:
            run_tar(['-czf', str(output), '-C', str(extract_dir), '--files-from', str(second_list_file)])
        finally:
            try:
                second_list_file.unlink()
            except FileNotFoundError:
                pass

    size_mb = output.stat().st_size / (1024 * 1024)
    digest = write_sha256(output)
    record_checksum(output, digest)
    print(f'Created {output.name} (~{size_mb:.2f} MiB) with up to {len(etext_ids)} books (missing entries skipped).')
    print(f'SHA256: {digest}')


def main() -> None:
    mode = os.environ.get('SAMPLE', 'all').strip().lower()
    if not mode:
        mode = 'all'

    if mode in {'sha', 'sha256', 'hash'}:
        update_existing_hashes()
        return

    if resolve_sample(mode) == 'all':
        modes = DEFAULT_BUILD_ORDER
    else:
        modes = [resolve_sample(mode)]

    for sample in modes:
        build_mini_archive(sample)


if __name__ == '__main__':
    main()
