#!/usr/bin/env python3
"""Generate aligned, model-predicted relative-depth textures for a MUSE catalog.

Install requirements-depth.txt, download the pinned ONNX model to a location
outside the repository, then run:

    python muse/tools/generate-depth.py --model /path/to/model.onnx

The default catalog is assets/photos/library.json, resolved relative to this script.
No network requests, Instagram access, image uploads, or model downloads occur.
The exact model source and SHA-256 are documented in assets/photos/depth/MODEL.md.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.parse import unquote, urlsplit


MODEL_REVISION = "4472b7362082ad9968fee890ca0f1e5aca36b93d"
MODEL_SHA256 = "afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c"
MODEL_URL = (
    "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/"
    f"{MODEL_REVISION}/onnx/model.onnx"
)
MODEL_LABEL = "Depth Anything V2 Small · ONNX FP32"
PREPROCESSING = {
    "size": {"height": 518, "width": 518},
    "keep_aspect_ratio": True,
    "ensure_multiple_of": 14,
    "resample": 3,
    "rescale_factor": 1 / 255,
    "image_mean": [0.485, 0.456, 0.406],
    "image_std": [0.229, 0.224, 0.225],
    "do_pad": False,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def local_path(root: Path, value: str, field: str) -> Path:
    """Catalog paths must refer to local assets beneath the catalog directory."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a nonempty relative image path")
    parsed = urlsplit(value)
    relative = Path(unquote(parsed.path))
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or relative.is_absolute():
        raise ValueError(f"{field} must be a local relative path: {value!r}")
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"{field} escapes the catalog directory: {value!r}")
    return resolved


def output_stem(entry: dict) -> str:
    ident = entry.get("id")
    if isinstance(ident, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", ident):
        return ident
    # Distinct paths and Unicode IDs remain distinct without unsafe filenames.
    identity = str(ident or entry["src"])
    label = re.sub(r"[^A-Za-z0-9_-]+", "-", Path(entry["src"]).stem).strip("-")[:60] or "photo"
    return f"{label}-{hashlib.sha256(identity.encode()).hexdigest()[:12]}"


def atomic_json(path: Path, value: dict) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", type=Path, required=True, help="Local verified Depth Anything V2 Small FP32 ONNX file; kept outside the repository")
    parser.add_argument("--catalog", type=Path, default=Path(__file__).resolve().parents[2] / "assets/photos/library.json", help="Catalog JSON; image paths are relative to its parent (default: assets/photos/library.json)")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate existing mapped depth textures; default is to skip them")
    parser.add_argument("--max-side", type=int, default=512, help="Maximum output texture dimension, without upscaling (default: 512)")
    parser.add_argument("--threads", type=int, default=4, help="ONNX Runtime CPU intra-op threads (default: 4)")
    args = parser.parse_args()
    if not 32 <= args.max_side <= 2048:
        parser.error("--max-side must be between 32 and 2048")
    if not 1 <= args.threads <= 64:
        parser.error("--threads must be between 1 and 64")
    return args


def run(args: argparse.Namespace) -> int:
    catalog_path = args.catalog.resolve(strict=True)
    root = catalog_path.parent
    initial_catalog_hash = sha256(catalog_path)
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    if not isinstance(catalog, dict) or not isinstance(catalog.get("photos"), list):
        raise ValueError("Catalog must contain a photos array")
    destination = local_path(root, "depth", "output directory")
    provenance_path = destination / "model-provenance.json"
    previous = json.loads(provenance_path.read_text(encoding="utf-8")) if provenance_path.exists() else {}
    if not isinstance(previous, dict):
        raise ValueError("Existing model-provenance.json must contain an object")

    work, skipped, seen_targets, active_ids = [], [], set(), set()
    for index, entry in enumerate(catalog["photos"]):
        if not isinstance(entry, dict):
            raise ValueError(f"photos[{index}] must be an object")
        if "muse" not in entry.get("uses", []):
            continue
        source = local_path(root, entry.get("src"), f"photos[{index}].src")
        if not source.is_file():
            raise ValueError(f"Missing source image: {source}")
        identity = str(entry.get("id") or entry["src"])
        if identity in active_ids:
            raise ValueError(f"Duplicate photo id/path: {identity}")
        active_ids.add(identity)
        target = destination / f"{output_stem(entry)}.png"
        if target in seen_targets:
            raise ValueError(f"Conflicting depth output filename: {target.name}")
        seen_targets.add(target)
        mapped = local_path(root, entry["depthSrc"], f"photos[{index}].depthSrc") if entry.get("depthSrc") else None
        if not args.overwrite and mapped and mapped.is_file():
            skipped.append(identity)
            print(f"SKIP {identity}: {entry['depthSrc']}")
            continue
        if target.exists() and not args.overwrite:
            # Never attach an unknown existing file or overwrite it implicitly.
            raise ValueError(f"Unmapped depth output already exists: {target}. Review it or pass --overwrite.")
        if target.resolve() == source:
            raise ValueError(f"Depth output would overwrite its source image: {source}")
        work.append((entry, identity, source, target))

    if not work:
        print(f"Nothing to generate; skipped {len(skipped)} existing depth maps. Catalog unchanged.")
        return 0
    model = args.model.resolve(strict=True)
    if sha256(model) != MODEL_SHA256:
        raise ValueError(f"Model SHA-256 mismatch. Expected {MODEL_SHA256}. Download the exact model from {MODEL_URL}")
    try:
        import numpy as np
        import onnxruntime as ort
        from PIL import Image, ImageOps
    except ImportError as error:
        raise ValueError("Install the pinned dependencies: python -m pip install -r muse/tools/requirements-depth.txt") from error

    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session = ort.InferenceSession(str(model), sess_options=options, providers=["CPUExecutionProvider"])
    mean = np.asarray(PREPROCESSING["image_mean"], dtype=np.float32).reshape(1, 1, 3)
    std = np.asarray(PREPROCESSING["image_std"], dtype=np.float32).reshape(1, 1, 3)
    # Preserve known outputs of this exact model without relabeling other
    # existing depth maps as predictions from this pipeline.
    records = {
        str(record.get("id")): record
        for record in previous.get("records", [])
        if isinstance(record, dict)
        and str(record.get("id")) in active_ids
        and record.get("modelSha256", previous.get("modelSha256")) == MODEL_SHA256
    }
    destination.mkdir(parents=True, exist_ok=True)
    staged_outputs = []
    with tempfile.TemporaryDirectory(prefix=".depth-staging-", dir=destination) as staging:
        for entry, identity, source, target in work:
            source_hash = sha256(source)
            with Image.open(source) as original:
                image = ImageOps.exif_transpose(original).convert("RGB")
            width, height = image.size
            scale_width, scale_height = 518 / width, 518 / height
            # Same minimal-change aspect-preserving rule as HF DPTImageProcessor.
            scale = scale_width if abs(1 - scale_width) < abs(1 - scale_height) else scale_height
            resized_width = max(14, round(width * scale / 14) * 14)
            resized_height = max(14, round(height * scale / 14) * 14)
            resized = image.resize((resized_width, resized_height), Image.Resampling.BICUBIC)
            values = np.asarray(resized, dtype=np.float32) * np.float32(1 / 255)
            tensor = np.ascontiguousarray(((values - mean) / std).transpose(2, 0, 1)[None], dtype=np.float32)
            started = time.monotonic()
            prediction = session.run(["predicted_depth"], {"pixel_values": tensor})[0][0]
            elapsed = time.monotonic() - started
            if prediction.ndim != 2 or not np.isfinite(prediction).all():
                raise ValueError(f"Invalid depth prediction: {identity}")
            low, high = float(prediction.min()), float(prediction.max())
            if not math.isfinite(high - low) or high - low <= 1e-5:
                raise ValueError(f"Flat depth prediction: {identity}")
            normalized = np.clip((prediction - low) / (high - low), 0, 1)
            output_scale = min(1, args.max_side / max(width, height))
            depth_width, depth_height = max(1, round(width * output_scale)), max(1, round(height * output_scale))
            float_map = Image.fromarray(normalized.astype("float32")).resize((depth_width, depth_height), Image.Resampling.BILINEAR)
            gray = Image.fromarray(np.rint(np.clip(np.asarray(float_map), 0, 1) * 255).astype("uint8"))
            staged = Path(staging) / target.name
            gray.save(staged, format="PNG", optimize=True)
            relative_target = target.relative_to(root).as_posix()
            entry.update({"depthSrc": relative_target, "depthModel": MODEL_LABEL, "depthType": "relative inverse depth", "depthDirection": "white-near", "depthNormalization": "per-image min-max to 0–255", "depthWidth": depth_width, "depthHeight": depth_height})
            record = {"id": identity, "image": entry["src"], "imageSha256": source_hash, "modelSha256": MODEL_SHA256, "inputTensorShape": list(tensor.shape), "rawOutputShape": list(prediction.shape), "rawMin": low, "rawMax": high, "seconds": round(elapsed, 3), "depthSrc": relative_target, "depthDimensions": [depth_width, depth_height], "bytes": staged.stat().st_size, "sha256": sha256(staged)}
            records[identity] = record
            staged_outputs.append((staged, target, source, source_hash))
            print(f"GENERATED {identity}: {depth_width}×{depth_height}, {elapsed:.2f}s", flush=True)

        # Refuse to silently overwrite concurrent catalog or image edits.
        if sha256(catalog_path) != initial_catalog_hash:
            raise ValueError("Catalog changed while inference ran. No generated maps committed; run again.")
        if any(sha256(source) != digest for _, _, source, digest in staged_outputs):
            raise ValueError("A source image changed while inference ran. No generated maps committed; run again.")
        if not args.overwrite and any(target.exists() for _, target, _, _ in staged_outputs):
            raise ValueError("A depth output appeared while inference ran. No generated maps committed; run again.")
        provenance = {
            "model": "Depth Anything V2 Small",
            "baseModel": "https://huggingface.co/depth-anything/Depth-Anything-V2-Small",
            "officialProject": "https://github.com/DepthAnything/Depth-Anything-V2",
            "onnxExport": "https://huggingface.co/onnx-community/depth-anything-v2-small",
            "onnxExportPublisher": "Hugging Face ONNX Community",
            "revision": MODEL_REVISION,
            "modelFile": "onnx/model.onnx",
            "modelSha256": MODEL_SHA256,
            "modelBytes": model.stat().st_size,
            "modelLicense": "Apache-2.0 (Small model)",
            "runtime": f"onnxruntime {ort.__version__}",
            "executionProvider": "CPUExecutionProvider",
            "precision": "float32",
            "preprocessing": PREPROCESSING,
            "resizeImplementationReference": "https://github.com/huggingface/transformers/blob/v4.44.2/src/transformers/models/dpt/image_processing_dpt.py",
            "normalization": "Per-image min/max to 8-bit; white/1 is near, black/0 is far. Aligned with the source image, preserving aspect ratio and EXIF orientation.",
            "limitations": "Monocular relative inverse depth for visual parallax; not metric depth or a complete 3D reconstruction.",
            "records": [records[str(entry.get("id") or entry["src"])] for entry in catalog["photos"] if str(entry.get("id") or entry["src"]) in records],
        }
        for staged, target, _, _ in staged_outputs:
            os.replace(staged, target)
        atomic_json(provenance_path, provenance)
        atomic_json(catalog_path, catalog)
    print(f"Done: generated {len(work)}, skipped {len(skipped)}. Updated {catalog_path}")
    return 0


def main() -> int:
    try:
        return run(arguments())
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
