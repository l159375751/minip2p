#!/usr/bin/env python3
import io
import os
import tarfile
from pathlib import Path

ETEXT_IDS = [11, 84, 98, 345, 1184, 1232, 1342, 1661, 2542, 2701]

ROOT = Path(__file__).resolve().parents[1]
FULL_ARCHIVE = ROOT / 'gutenberg-txt-files.tar.gz'
OUTPUT = ROOT / 'mini-gutenberg-10mb.tar.gz'


def select_members():
    with tarfile.open(FULL_ARCHIVE, 'r:gz') as tar:
        names = {member.name: member for member in tar.getmembers() if member.isfile()}

    selected = []
    for etext_id in ETEXT_IDS:
        name = f'cache/epub/{etext_id}/pg{etext_id}.txt'
        if name not in names:
            raise FileNotFoundError(f'Missing {name} in archive')
        selected.append(name)
    return selected


def build_mini_archive():
    members = select_members()
    temp_dir = ROOT / '.mini_tmp'
    if temp_dir.exists():
        for item in temp_dir.rglob('*'):
            if item.is_file():
                item.unlink()
            else:
                item.rmdir()
        temp_dir.rmdir()
    temp_dir.mkdir()

    with tarfile.open(FULL_ARCHIVE, 'r:gz') as tar:
        tar.extractall(path=temp_dir, members=(tar.getmember(name) for name in members))

    with tarfile.open(OUTPUT, 'w:gz', compresslevel=9) as tar_out:
        for name in members:
            file_path = temp_dir / name
            tar_out.add(file_path, arcname=name)

    for item in sorted(temp_dir.glob('**/*'), reverse=True):
        if item.is_file():
            item.unlink()
        else:
            item.rmdir()

    print(f'Created {OUTPUT} ({OUTPUT.stat().st_size / (1024 * 1024):.2f} MiB) with {len(members)} books')


if __name__ == '__main__':
    build_mini_archive()
