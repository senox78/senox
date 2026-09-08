#!/usr/bin/env python3
"""
Batch compress images under src/content.
PNG/JPG -> overwrite in place (with backup by default)
Files already small enough are skipped.

Usage:
    python3 compress_images.py               # preview only (no changes)
    python3 compress_images.py --apply       # actually compress
    python3 compress_images.py --apply --no-backup  # no backup
"""

import argparse
import shutil
from pathlib import Path
from PIL import Image

# ========== settings ==========
VERSION = "0.1.0"
CONTENT_DIR = Path("src/content")   # run from repository root
MAX_WIDTH = 1600                     # resize if wider than this
JPEG_QUALITY = 82
PNG_COMPRESS = 9                     # 0-9 (9 = max compression)
SKIP_UNDER_KB = 150                  # skip files smaller than 150KB
BACKUP_SUFFIX = ".bak"
# ==========================

SUPPORTED = {".png", ".jpg", ".jpeg", ".webp"}


def human(size: float) -> str:
    for unit in ("B", "KB", "MB"):
        if size < 1024:
            return f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}GB"


def compress(path: Path, apply: bool, backup: bool) -> tuple[int, int] | None:
    """Compress and return (before, after) bytes. None if skipped."""
    before = path.stat().st_size

    if before < SKIP_UNDER_KB * 1024:
        return None

    img = Image.open(path)

    # RGBA -> RGB (JPEG does not support alpha)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # resize
    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        img = img.resize(
            (MAX_WIDTH, int(img.height * ratio)), Image.Resampling.LANCZOS
        )

    if not apply:
        # estimate size by compressing in memory
        import io
        buf = io.BytesIO()
        suffix = path.suffix.lower()
        if suffix in (".jpg", ".jpeg"):
            img.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True)
        elif suffix == ".png":
            img.save(buf, "PNG", compress_level=PNG_COMPRESS, optimize=True)
        elif suffix == ".webp":
            img.save(buf, "WEBP", quality=JPEG_QUALITY, method=6)
        after = buf.tell()
        if after >= before:
            return None  # skip: compressed is larger than original
        return before, after

    if backup:
        shutil.copy2(path, path.with_suffix(path.suffix + BACKUP_SUFFIX))

    suffix = path.suffix.lower()
    if suffix in (".jpg", ".jpeg"):
        img.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)
    elif suffix == ".png":
        img.save(path, "PNG", compress_level=PNG_COMPRESS, optimize=True)
    elif suffix == ".webp":
        img.save(path, "WEBP", quality=JPEG_QUALITY, method=6)

    after = path.stat().st_size
    if after >= before:
        # revert: restore from backup or just leave original
        import shutil as _sh
        if backup:
            _sh.move(str(path.with_suffix(path.suffix + BACKUP_SUFFIX)), str(path))
        return None  # skip: compressed is larger
    return before, after


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", action="version", version=f"%(prog)s {VERSION}")
    parser.add_argument("--apply", action="store_true", help="actually compress (omit for dry-run)")
    parser.add_argument("--no-backup", action="store_true", help="skip backup")
    parser.add_argument("--clean", action="store_true", help="delete all .bak files and exit")
    args = parser.parse_args()

    if args.clean:
        baks = list(CONTENT_DIR.rglob(f"*{BACKUP_SUFFIX}"))
        if not baks:
            print("No .bak files found.")
        for f in baks:
            f.unlink()
            print(f"Deleted: {f}")
        print(f"Done: {len(baks)} file(s) removed.")
        return

    apply = args.apply
    backup = not args.no_backup

    if not CONTENT_DIR.exists():
        print(f"[ERROR] {CONTENT_DIR} not found. Run from the repository root.")
        return

    images = sorted(
        p for p in CONTENT_DIR.rglob("*")
        if p.suffix.lower() in SUPPORTED and BACKUP_SUFFIX not in p.name
    )

    total_before = total_after = 0
    processed = skipped_small = skipped_larger = 0

    print(f"{'Mode':}: {'Apply' if apply else 'DRY-RUN (add --apply to actually compress)'}\n")
    print(f"{'File':<55} {'Before':>8} {'After':>8} {'Saved':>7}")
    print("-" * 82)

    for img_path in images:
        before_size = img_path.stat().st_size
        result = compress(img_path, apply=apply, backup=backup)
        if result is None:
            if before_size < SKIP_UNDER_KB * 1024:
                skipped_small += 1
            else:
                skipped_larger += 1
            continue

        before, after = result
        total_before += before
        total_after += after
        processed += 1

        label = str(img_path)
        saved_pct = (1 - after / before) * 100
        after_str = human(after)
        print(f"{label:<55} {human(before):>8} {after_str:>8} {saved_pct:>6.1f}%")

    print("-" * 82)
    if apply:
        print(f"Total: {processed} compressed, {skipped_small} skipped (too small), {skipped_larger} skipped (already optimal)")
        if processed:
            saved = total_before - total_after
            pct = saved / total_before * 100
            print(f"Saved: {human(total_before)} -> {human(total_after)} (-{human(saved)}, -{pct:.1f}%)")
        if backup:
            print(f"Backup: original + '{BACKUP_SUFFIX}'  saved alongside")
            print(f"To remove: find src/content -name '*{BACKUP_SUFFIX}' -delete")
    else:
        print(f"Total: {processed} targets, {skipped_small} skipped (too small), {skipped_larger} skipped (already optimal)")
        if processed:
            saved = total_before - total_after
            pct = saved / total_before * 100
            print(f"Estimated savings: {human(total_before)} -> {human(total_after)} (-{human(saved)}, -{pct:.1f}%)")
        print("* No files changed. Add --apply to compress.")


if __name__ == "__main__":
    main()
