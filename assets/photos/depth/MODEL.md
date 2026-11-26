# Precomputed relative-depth maps

These PNGs were generated from the adjacent, exact source WebP photographs using **Depth Anything V2 Small**, run locally through **ONNX Runtime 1.23.2 / CPUExecutionProvider / float32**. They are model predictions, not image luminance conversions.

- Base model: https://huggingface.co/depth-anything/Depth-Anything-V2-Small
- Official project: https://github.com/DepthAnything/Depth-Anything-V2
- ONNX export publisher: Hugging Face ONNX Community
- Export: https://huggingface.co/onnx-community/depth-anything-v2-small
- Pinned export revision: `4472b7362082ad9968fee890ca0f1e5aca36b93d`
- Model file: `onnx/model.onnx`, 99,060,839 bytes
- Verified model SHA-256: `afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c`
- Model license: Apache-2.0, as declared for the **Small** variant. This does not change the rights in the input photographs.

The complete model is not bundled or loaded by the website. Only the small precomputed depth textures are shipped.

## Texture interpretation

Each depth texture has the same aspect ratio and orientation as its corresponding source photograph, with a maximum side of 512 pixels. Read the red channel (all channels are equal after browser decoding): **0 / black is farther; 1 / white is nearer**. Values are normalized independently per photograph from the raw prediction minimum and maximum. Use the texture coordinates from the color photograph without an additional crop. If the color image is cropped in the renderer, apply the identical UV transform to its depth texture.

For particles, use normalized depth for a bounded relative Z offset; a useful starting point is `(depth - 0.5) * depthStrength`. These are monocular relative inverse-depth predictions for visual parallax. They are not metric measurements, a complete 3D scan, or an anatomical reconstruction. Background occlusions will not contain unseen geometry.

See `model-provenance.json` for preprocessing configuration, per-image tensor shapes, elapsed inference times, raw ranges, output dimensions, and SHA-256 checksums.

## Generate depth for new gallery photographs

From the repository root, create a Python environment and install the small CPU dependencies:

```sh
python3 -m venv /tmp/muse-depth-env
/tmp/muse-depth-env/bin/python -m pip install -r muse/tools/requirements-depth.txt
```

Download the pinned **99 MB FP32 ONNX file** to a location outside this repository:

https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/4472b7362082ad9968fee890ca0f1e5aca36b93d/onnx/model.onnx

Expected SHA-256: `afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c`. The script verifies this checksum before loading the model; it never downloads weights itself.

Add local photographs and their metadata to the catalog, then run:

```sh
/tmp/muse-depth-env/bin/python muse/tools/generate-depth.py --model /path/outside/repository/model.onnx
```

The default catalog is `assets/photos/library.json`, resolved relative to the script rather than the current directory. For another catalog:

```sh
/tmp/muse-depth-env/bin/python muse/tools/generate-depth.py --model /path/outside/repository/model.onnx --catalog /path/to/gallery/library.json
```

Photo `src` paths are relative to the catalog directory. Outputs are written under that directory's `photos/depth/`. The script updates `depthSrc` and depth metadata in the catalog and records the model, input/output checksums, dimensions and actual inference time in `model-provenance.json`. Existing photo/source/rights/publication fields are preserved. No photo IDs are hardcoded, and no asset is uploaded or automatically published.

Existing mapped depth files are skipped by default. To regenerate after changing a photograph, or to change the output size, explicitly pass `--overwrite`:

```sh
/tmp/muse-depth-env/bin/python muse/tools/generate-depth.py --model /path/outside/repository/model.onnx --overwrite --max-side 512 --threads 4
```

The image is EXIF-oriented before inference, resized with aspect ratio preserved and dimensions rounded to multiples of 14, converted to RGB, scaled by `1/255`, and normalized with ImageNet means `[0.485, 0.456, 0.406]` and standard deviations `[0.229, 0.224, 0.225]`. Catalog changes are written atomically; if the catalog or a processed source changes during inference, the script stops without committing the staged maps. A skipped file is not reclassified as this model's output unless it already has matching provenance.
