# 3D Model Optimisation Report

A heavy glTF model taken from 48 MB to 3.4 MB, measured before and after, plus the draw-call
difference that instancing makes for 500 copies. Everything here can be repeated with the commands
below and the benchmark page (`/model-bench.html`).

## Summary

| Metric (one model) | Raw | Optimised (main file) | Optimised, 512 px textures |
|---|---|---|---|
| File size | 48.39 MB in 17 files | **3.42 MB** in 1 file (−93%) | **2.24 MB** in 1 file (−95%) |
| Triangles in the model | 94,722 | **53,013** (−44%) | 53,013 |
| Draw calls | 11 | 11 | 11 |
| GPU texture memory (estimate) | 285.2 MB | **8.7 MB** (−97%) | **3.5 MB** (−99%) |
| Load to first frame, 10 Mbps | 39.1 s | **3.55 s** (11× faster) | **2.59 s** (15× faster) |
| Frame rate / main-thread time per frame | 60 FPS / 0.9 ms | 60 FPS / 1.1–1.3 ms | 60 FPS / 1.2 ms |
| Looks | reference | almost identical | printed logos slightly softer |

| 500 copies | Draw calls | Main-thread time per frame | FPS |
|---|---|---|---|
| Raw, no instancing | 5,264 | 112.6 ms | 8.9 |
| Raw, instancing | **11** | **1.8 ms** | 8.8 |
| Optimised, no instancing | 5,264 | 77.9 ms | 12.9 |
| Optimised, instancing | **11** | **1.7 ms** | 13.4 |

Instancing cuts draw calls about 480× and the CPU work per frame from 78–113 ms to under 2 ms. The
frame rate stays low because 500 detailed helmets are 50–90 million triangles per frame: the GPU is now
the limit, not the draw calls. The fix for that is a low-detail version (LOD), see "Next steps".

## Source model

- **Name:** Flight Helmet
- **Source and licence:** [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/FlightHelmet),
  by Gary Hsu, **CC0 1.0** (public domain).
- **Why this model:** the brief suggests the Khronos samples; it is 48 MB (over the 10 MB minimum);
  it has several meshes, full PBR materials and large textures, like a CAD export; and the licence is
  clear. It is not electrical equipment, so it lives on the benchmark page, not in the editor.
- **Structure:** 6 meshes, each with its own material and 3 textures of 2048 × 2048 px (colour,
  normal, occlusion/roughness/metal): 15 PNGs plus a 3.2 MB geometry file. The lenses use the
  `KHR_materials_transmission` glass extension.

## Pipeline

```bash
npm run model:fetch       # downloads the raw model into public/models/raw/ (gitignored, never committed)
npm run model:optimise    # the steps below → public/models/flight-helmet.glb
npm run model:variants    # also builds the 512 px version → public/models/flight-helmet-512.glb
```

The script (`scripts/model-optimise.mjs`) runs `@gltf-transform/cli` 4.5.1 one step at a time, so the
effect of each step is visible:

| # | Step | Command | Size after |
|---|---|---|---|
| 1 | Normal maps to 512 px, and pack 17 files into one `.glb` | `resize --pattern "*_Normal.png" --width 512 --height 512` | 35.01 MB |
| 2 | Remove duplicate data | `dedup` | 35.01 MB |
| 3 | Remove unused data | `prune` | 35.01 MB |
| 4 | Merge identical vertices | `weld` | 35.01 MB |
| 5 | Halve the vertices where the shape changes < 0.1% (~0.7 mm) | `simplify --ratio 0.5 --error 0.001` | 33.68 MB |
| 6 | Other textures to 1024 px | `resize --width 1024 --height 1024` | 15.70 MB |
| 7 | Normal maps → KTX2 UASTC + Zstandard | `uastc --slots normalTexture --level 2 --zstd 18` | 15.22 MB |
| 8 | Colour and occlusion/roughness/metal → KTX2 ETC1S | `etc1s --slots "{baseColorTexture,occlusionTexture,metallicRoughnessTexture}" --quality 255` | 4.87 MB |
| 9 | Geometry → Meshopt compression + quantization | `meshopt --level high` | **3.42 MB** |

Why the steps are in this order and set this way:

- **Normal maps are resized first** because `resize` picks textures by file name, and names only exist
  in the raw `.gltf`.
- **Simplify** stops at its error limit: the hose (the most detailed part) kept 79% of its triangles, the
  rest about 50%.
- **Two KTX2 modes.** UASTC is higher quality but bigger; ETC1S is much smaller. Normal maps get UASTC
  because block artefacts there show as bumpy shading. Colour and occlusion/roughness/metal maps
  change smoothly, so ETC1S is enough. The first try used UASTC for those maps as well: 6.29 MB.
- **Normal maps at 512 px.** Even with Zstandard, UASTC normal maps were about 1 MB each at 1024 px.
  At 512 px they are about 0.27 MB each, and the visual difference at editor size is negligible.

## Libraries used

| What | Library | Decoded in the browser by |
|---|---|---|
| Geometry compression | **meshoptimizer** (`EXT_meshopt_compression` + `KHR_mesh_quantization`) | `MeshoptDecoder` (a few KB of JavaScript, bundled), via drei `useGLTF(url, false, true)` |
| Triangle reduction | meshoptimizer's simplifier | – |
| Texture compression | **Basis Universal** in **KTX2**, encoded by **KTX-Software 4.4.2** (`ktx create`) | three.js `KTX2Loader` and its Basis transcoder (WebAssembly, 542 KB including its JavaScript, bundled with three.js) |
| Texture resizing | sharp (inside gltf-transform) | – |

KTX2 matters for memory, not only download size: PNG, JPEG and WebP are unpacked to full size on the
GPU, while KTX2 is transcoded at load time to a format the GPU reads while still compressed. That is
the 285 MB → 8.7 MB texture memory drop, which matters on the brief's 8 GB laptops with integrated
graphics.

## Meshopt or Draco

Both were measured on the same model with default settings (Draco: 14-bit positions, 10-bit normals,
12-bit texture coordinates). Same machine and method as below.

| Version | File size | Extra decoder download | Load, local (median of 5) | Load at 10 Mbps | Looks |
|---|---|---|---|---|---|
| **Meshopt**, 1024 px textures | 3.42 MB | – (bundled, a few KB) | 422 ms | **3.55 s** | reference |
| Draco, 1024 px textures | 3.34 MB | + 204 KB WebAssembly | 422 ms | 3.63 s | identical |
| **Meshopt**, 512 px textures | 2.24 MB | – | 427 ms | **2.59 s** | logos slightly softer |
| Draco, 512 px textures | 2.17 MB | + 204 KB WebAssembly | 424 ms | 2.67 s | identical to Meshopt-512 |

All four: 60 FPS, 1.2–1.4 ms main-thread time per frame, 11 draw calls, the same triangle count.
A lower-precision Draco (11-bit positions, 8-bit normals) gave 3.28 MB.

**Decision: Meshopt.**

- Draco compresses this geometry about 18% better, but geometry is now only about 0.45 MB of the file.
  Textures are 87%, so the whole file is only 2% smaller.
- Draco's decoder (204 KB) is bigger than the 80 KB it saves, so at 10 Mbps it loads about 0.08 s
  slower.
- By default drei fetches the Draco decoder from Google's CDN, which locked-down corporate networks
  may block, so it would have to be self-hosted.
- Draco decodes more slowly than Meshopt.

**Why not under 1 MB?** At 512 px the file is still about 1.07 MB of normal maps, 0.72 MB of other
textures and 0.45 MB of geometry. Under 1 MB would need visible quality cuts: 256 px textures,
lower-quality normal maps, or much stronger simplification.

## How measured

- **Hardware:** MacBook Air 13" (M4, 2025, 16 GB), built-in 60 Hz Retina screen, macOS 26.5.
- **Browser:** Google Chrome 155, WebGL through ANGLE / Metal (Apple M4 GPU).
- **Window:** 1280 × 700 at pixel ratio 2; canvas pixel ratio capped at 1.5.
- **Build:** production (`npm run build && npm run preview`), page `/model-bench.html`. Each setting is
  a new page load with the browser cache off, so every load starts cold.
- **Load time:** from the page's script starting to the first frame drawn with the model. The 10 Mbps
  runs used Chrome DevTools network emulation (10 Mbps down, 5 Mbps up, 40 ms latency). Locally,
  every version loads in about 0.42–0.54 s: that is mostly page start-up, so decode differences are
  too small to see.
- **Draw calls and triangles:** `renderer.info.render`, shown on the page.
- **Frame rate and main-thread time:** `requestAnimationFrame` intervals over 4–5 s, and Chrome's
  performance counters (`TaskDuration`), scripted with Playwright in a real Chrome window.
- **GPU texture memory:** the `gpuSize` estimate from `gltf-transform inspect` (includes mipmaps), not
  measured in the browser.

## Notes and trade-offs

- **Visual quality:** side-by-side screenshots of raw and optimised are almost identical. At 512 px the
  printed logo on the helmet is a little softer.
- **Draw calls stay at 11 for one helmet.** Each mesh has its own textures, so merging meshes would need
  a texture atlas first. 11, not 6: the glass lenses use `KHR_materials_transmission`, so three.js draws
  the other meshes a second time into a texture to show through the glass. That also doubles the
  triangles per frame.
- **UASTC "RDO"** would shrink the normal maps further, but gltf-transform 4.5.1 does not pass its RDO
  options to KTX-Software 4.4.2 (checked with `--verbose`). Recorded so it can be enabled when fixed.
- **KTX-Software** has no Homebrew package. The script finds it on `PATH`, or in `.tools/ktx/bin`
  (unpacked from the official macOS `.pkg` without installing, gitignored). Without it, the script
  falls back to WebP textures, which are small to download but not compressed on the GPU.

## Next steps (not done)

1. **Low-detail version (LOD):** a second, simpler mesh (about 5% of the triangles) for helmets that are
   small on screen. This is what would make 500 copies smooth, since they are limited by triangles.
2. **Simpler glass:** replace the transmission lenses with plain transparency: 11 → 6 draw calls and
   half the triangles per frame, with a small visual change.
3. **Texture atlas:** merge the 6 materials into 1–2, so one helmet is 1–2 draw calls.
4. **In the real product** (Part A): run this pipeline in CI for every CAD export, with size and triangle
   budgets per model; serve files with content hashes and long cache headers; load models per type,
   lazily, low detail first.
