#!/usr/bin/env python3
"""Build a MUSE photo manifest from a locally reviewed CSV, not a web scraper.
CSV headers: filename,id,title,source,date,tags,publish,rights
tags are separated with |; publish must equal true; rights must describe permission.
"""
import argparse, csv, json, shutil
from pathlib import Path
from urllib.parse import urlparse

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--source", required=True, type=Path)
p.add_argument("--csv", required=True, type=Path)
args = p.parse_args()
base = Path(__file__).resolve().parents[1]
source = args.source.resolve()
allowed = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
rows = []
ids = set()
names = set()
with args.csv.open(encoding="utf-8-sig", newline="") as f:
    for r in csv.DictReader(f):
        if r.get("publish", "").strip().lower() != "true":
            continue
        name = r.get("filename", "").strip()
        ident = r.get("id", "").strip() or Path(name).stem
        rights = r.get("rights", "").strip()
        post = r.get("source", "").strip()
        path = (source / name).resolve()
        if not name or Path(name).name != name or path.parent != source or path.suffix.lower() not in allowed or not path.is_file():
            raise SystemExit(f"Invalid approved filename: {name}")
        if not rights or urlparse(post).scheme != "https":
            raise SystemExit(f"Missing rights record or HTTPS source: {name}")
        if ident in ids or name in names:
            raise SystemExit(f"Duplicate ID or filename: {name}")
        ids.add(ident)
        names.add(name)
        rows.append((path, {"id": ident, "src": "photos/" + name, "title": r.get("title", "").strip() or ident, "source": post, "date": r.get("date", "").strip(), "tags": [x.strip() for x in r.get("tags", "").split("|") if x.strip()], "publish": True, "rights": rights}))
dest = base / "photos"
dest.mkdir(exist_ok=True)
for path, item in rows:
    target = dest / path.name
    if target.resolve() != path:
        shutil.copy2(path, target)
data = {"version": 1, "photos": [item for _, item in rows]}
tmp = base / "library.json.tmp"
tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
tmp.replace(base / "library.json")
print(f"Indexed {len(rows)} approved images. Review git diff before publishing.")
