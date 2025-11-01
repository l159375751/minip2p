#!/usr/bin/env python3
"""Build trimmed Gutenberg tarballs from the full archive using system tar.

Usage:
    python utils/create_mini_archive.py [demo|100|1k|10k]
Environment:
    SAMPLE=... works as well.

Produces files like mini-gutenberg-10.tar.gz, mini-gutenberg-100.tar.gz, etc.
"""

import os
import sys
import tempfile
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FULL_ARCHIVE = ROOT / 'gutenberg-txt-files.tar.gz'
TARGETS = {
    'demo': [11, 84, 98, 345, 1184, 1232, 1342, 1661, 2542, 2701],
    '100': list(range(1, 101)),
    '1k': list(range(1, 1001)),
    '10k': list(range(1, 10_001)),
}


def build_id_list(mode: str) -> list[int]:
    if mode not in TARGETS:
        raise ValueError(f"Unknown sample '{mode}'. Choose from {', '.join(TARGETS.keys())}.")
    return TARGETS[mode]


def run_tar(args: list[str]) -> subprocess.CompletedProcess:
    result = subprocess.run(['tar', *args], capture_output=True, text=True)
    allow_fail = '--ignore-failed-read' in args
    if result.returncode != 0 and not allow_fail:
        raise RuntimeError(f"tar {' '.join(args)} failed:\n{result.stderr}")
    if result.returncode != 0 and allow_fail:
        print(result.stderr.strip())
    return result


def build_mini_archive(mode: str) -> None:
    etext_ids = build_id_list(mode)
    if mode == 'demo':
        output_name = 'mini-gutenberg-10mb.tar.gz'
    elif mode == '100':
        output_name = 'mini-gutenberg-100.tar.gz'
    else:
        output_name = f'mini-gutenberg-{mode}.tar.gz'
    output = ROOT / output_name

    with tempfile.TemporaryDirectory(prefix='mini-gutenberg-', dir=ROOT) as tmp:
        tmp_path = Path(tmp)
        list_file = tmp_path / 'entries.txt'
        with list_file.open('w', encoding='utf-8') as handle:
            for etext_id in etext_ids:
                handle.write(f'cache/epub/{etext_id}/pg{etext_id}.txt\n')

        extract_dir = tmp_path / 'extract'
        extract_dir.mkdir()

        run_tar(['-xzf', str(FULL_ARCHIVE), '-C', str(extract_dir), '--ignore-failed-read', '--files-from', str(list_file)])
        extracted = sorted(extract_dir.glob('cache/epub/*/pg*.txt'))
        if not extracted:
            raise FileNotFoundError('No matching entries were extracted from the archive')
        with list_file.open('w', encoding='utf-8') as handle:
            for path in extracted:
                handle.write(str(path.relative_to(extract_dir)) + '\n')
        run_tar(['-czf', str(output), '-C', str(extract_dir), '--files-from', str(list_file)])

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f'Created {output} ({size_mb:.2f} MiB) with up to {len(etext_ids)} books (missing entries skipped).')


def main() -> None:
    mode = 'demo'
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    elif 'SAMPLE' in os.environ:
        mode = os.environ['SAMPLE']
    build_mini_archive(mode)


if __name__ == '__main__':
    main()
