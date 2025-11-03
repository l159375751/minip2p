#!/usr/bin/env python3
"""Build trimmed Gutenberg tarballs from the full archive using system tar.

Usage:
    python3 utils/create_mini_archive.py          # builds 10mb/100mb/1000mb bundles
    SAMPLE=10mb python3 utils/create_mini_archive.py
    SAMPLE=sha python3 utils/create_mini_archive.py
"""

from __future__ import annotations

import os
import re
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


def dedupe_preserve_order(values: list[int]) -> list[int]:
    seen: set[int] = set()
    ordered: list[int] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def collect_sample_ids(samples: list[str]) -> tuple[dict[str, list[int]], list[int]]:
    id_map: dict[str, list[int]] = {}
    superset: list[int] = []

    for sample in samples:
        ids = build_id_list(sample)
        id_map[sample] = ids
        superset.extend(ids)

    return id_map, dedupe_preserve_order(superset)


def extract_superset(etext_ids: list[int], staging_dir: Path) -> dict[int, str]:
    if not etext_ids:
        return {}

    staging_dir.mkdir(parents=True, exist_ok=True)

    initial_list = [f'cache/epub/{etext_id}/pg{etext_id}.txt' for etext_id in etext_ids]
    list_file = write_list_file(initial_list)
    try:
        run_tar([
            '-xzf', str(FULL_ARCHIVE),
            '-C', str(staging_dir),
            '--ignore-failed-read',
            '--files-from', str(list_file)
        ])
    finally:
        try:
            list_file.unlink()
        except FileNotFoundError:
            pass

    mapping: dict[int, str] = {}
    for txt_path in staging_dir.glob('cache/epub/*/pg*.txt'):
        match = re.match(r'pg(\d+)', txt_path.stem)
        if not match:
            continue
        etext_id = int(match.group(1))
        mapping[etext_id] = str(txt_path.relative_to(staging_dir))

    return mapping


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


def build_archives(samples: list[str]) -> None:
    if not samples:
        return

    ensure_output_dir()
    ensure_full_archive()
    canonical_samples: list[str] = []
    for sample in samples:
        resolved = resolve_sample(sample)
        if resolved == 'all':
            raise ValueError('Use "all" only as a top-level mode.')
        if resolved not in canonical_samples:
            canonical_samples.append(resolved)

    id_map, superset_ids = collect_sample_ids(canonical_samples)

    with tempfile.TemporaryDirectory(prefix='mini-gutenberg-') as tmp:
        staging_root = Path(tmp) / 'extract'
        available_files = extract_superset(superset_ids, staging_root)
        print(f'Extracted {len(available_files)} of {len(superset_ids)} requested text files into staging.')

        for sample in canonical_samples:
            ids = id_map[sample]
            selected_paths: list[str] = []
            missing_ids: list[int] = []

            for etext_id in ids:
                rel_path = available_files.get(etext_id)
                if rel_path:
                    selected_paths.append(rel_path)
                else:
                    missing_ids.append(etext_id)

            if not selected_paths:
                print(f'⚠️  No files found for sampler "{sample}" (all entries missing).')
                continue

            output = OUTPUT_DIR / f'mini-gutenberg-{sample}.tar.gz'

            list_file = write_list_file(selected_paths)
            try:
                run_tar([
                    '-czf', str(output),
                    '-C', str(staging_root),
                    '--files-from', str(list_file)
                ])
            finally:
                try:
                    list_file.unlink()
                except FileNotFoundError:
                    pass

            size_mb = output.stat().st_size / (1024 * 1024)
            digest = write_sha256(output)
            record_checksum(output, digest)

            missing_note = f" | Missing entries skipped: {len(missing_ids)}" if missing_ids else ""
            print(f'Created {output.name} (~{size_mb:.2f} MiB){missing_note}.')
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
