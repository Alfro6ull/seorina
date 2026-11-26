#!/usr/bin/env python3
"""Build the shared MUSE catalog from local files and a reviewed CSV.

CSV: filename,id,title,source,date,tags,publish,rights. Tags use |; publish must
equal true; rights records the actual rights status, not an inferred license.
Optional: depth_filename (copy from --source) OR depth_src/depthSrc (reference
an existing map relative to the catalog), plus depth_model, depth_type,
depth_direction, depth_normalization, depth_kind and depth_description.
Only white-near maps are supported. No scraping or depth generation occurs.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
from urllib.parse import unquote, urlsplit

ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".bmp"}
DEPTH_FIELDS = {
    "depth_model": "depthModel", "depth_type": "depthType",
    "depth_direction": "depthDirection", "depth_normalization": "depthNormalization",
    "depth_kind": "depthKind", "depth_description": "depthDescription",
}


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def local_asset(root: Path, value: str, field: str) -> Path:
    parsed = urlsplit(value)
    relative = Path(unquote(parsed.path))
    if not value or parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or relative.is_absolute():
        raise ValueError(f"{field} must be a local relative image path: {value!r}")
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or path.suffix.lower() not in ALLOWED or not path.is_file():
        raise ValueError(f"Invalid {field}: {value!r}")
    return path


def same_asset(path: Path, root: Path, old_value: object, expected_hash: object = None) -> bool:
    if not isinstance(old_value, str):
        return False
    try:
        if isinstance(expected_hash, str) and expected_hash:
            return digest(path) == expected_hash
        previous = local_asset(root, old_value, "existing asset")
        return path == previous or digest(path) == digest(previous)
    except (OSError, ValueError):
        return False


def clear_depth(item: dict) -> None:
    for key in list(item):
        if key.startswith("depth"):
            del item[key]


def atomic_json(path: Path, value: dict) -> None:
    name = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False) as stream:
            name = stream.name
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def run(args: argparse.Namespace) -> int:
    source, catalog = args.source.resolve(), args.catalog.resolve()
    root = catalog.parent
    if not source.is_dir():
        raise ValueError(f"Source directory does not exist: {source}")
    existing = json.loads(catalog.read_text(encoding="utf-8")) if catalog.is_file() else {}
    if not isinstance(existing, dict) or not isinstance(existing.get("photos", []), list):
        raise ValueError("Existing catalog must be an object with a photos array")
    previous = {str(item.get("id")): item for item in existing.get("photos", []) if isinstance(item, dict)}
    rows, ids, names, copies = [], set(), set(), {}

    def schedule_copy(path: Path, target: Path) -> None:
        target = target.resolve()
        prior = copies.get(target)
        if prior and path != prior and digest(path) != digest(prior):
            raise ValueError(f"Different input files target the same asset: {target.name}")
        copies[target] = path

    with args.csv.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            if row.get("publish", "").strip().lower() != "true":
                continue
            name = row.get("filename", "").strip()
            ident = row.get("id", "").strip() or Path(name).stem
            rights, post = row.get("rights", "").strip(), row.get("source", "").strip()
            post_url = urlsplit(post)
            if not name or Path(name).name != name:
                raise ValueError(f"filename must be a plain filename: {name!r}")
            path = local_asset(source, name, "filename")
            if not rights or post_url.scheme != "https" or not post_url.netloc or post_url.username or post_url.password:
                raise ValueError(f"Missing rights note or valid HTTPS source: {name}")
            if ident in ids or name in names:
                raise ValueError(f"Duplicate ID or filename: {name}")
            ids.add(ident)
            names.add(name)
            old = previous.get(ident, {})
            item = dict(old) if same_asset(path, root, old.get("src"), old.get("sha256")) else {}
            item.update({
                "id": ident, "src": "photos/" + name,
                "title": row.get("title", "").strip() or ident,
                "source": post, "date": row.get("date", "").strip(),
                "tags": [tag.strip() for tag in row.get("tags", "").split("|") if tag.strip()],
                "publish": True, "rights": rights,
                "sha256": digest(path), "bytes": path.stat().st_size,
            })
            schedule_copy(path, root / "photos" / name)
            depth_name = row.get("depth_filename", "").strip()
            depth_src = (row.get("depth_src", "") or row.get("depthSrc", "")).strip()
            if depth_name and depth_src:
                raise ValueError(f"Use depth_filename OR depth_src, not both: {name}")
            if depth_name or depth_src:
                if depth_name:
                    depth_path = local_asset(source, depth_name, "depth_filename")
                    depth_value = "photos/depth/" + depth_path.name
                    schedule_copy(depth_path, root / depth_value)
                else:
                    depth_path = local_asset(root, depth_src, "depth_src")
                    depth_value = depth_path.relative_to(root).as_posix()
                if not same_asset(depth_path, root, item.get("depthSrc"), item.get("depthSha256")):
                    clear_depth(item)
                item["depthSrc"] = depth_value
                item["depthSha256"] = digest(depth_path)
            elif item.get("depthSrc"):
                depth_path = local_asset(root, item["depthSrc"], "preserved depthSrc")
                if item.get("depthSha256") and digest(depth_path) != item["depthSha256"]:
                    raise ValueError(f"Existing depth map changed; supply its new depth metadata: {name}")
                item["depthSha256"] = digest(depth_path)
            if item.get("depthSrc"):
                for column, field in DEPTH_FIELDS.items():
                    value = (row.get(column, "") or row.get(field, "")).strip()
                    if value:
                        item[field] = value
                if item.setdefault("depthDirection", "white-near") != "white-near":
                    raise ValueError(f"Depth map must use white-near values: {name}")
            rows.append(item)

    # Finish all CSV/path validation before modifying assets or the catalog.
    root.mkdir(parents=True, exist_ok=True)
    for target, path in copies.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        if target != path:
            shutil.copy2(path, target)
    data = dict(existing)
    version = existing.get("version", 1)
    data.update({"version": max(2, version if isinstance(version, int) else 1), "photos": rows})
    atomic_json(catalog, data)
    print(f"Indexed {len(rows)} photos ({sum(bool(item.get('depthSrc')) for item in rows)} with depth maps): {catalog}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--catalog", type=Path, default=Path(__file__).resolve().parents[1] / "library.json")
    try:
        return run(parser.parse_args())
    except (OSError, ValueError, csv.Error) as failure:
        print(f"Index failed: {failure}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
