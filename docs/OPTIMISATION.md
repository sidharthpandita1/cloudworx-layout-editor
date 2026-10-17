# 3D Model Optimisation Report

> Template. Fill in once the optimisation is done (PLAN.md, Day 3).

## Source model

- Name:
- Source and licence (with link):
- Why this model: (for example, closest to industrial equipment, has textures, ≥ 10 MB)

## Pipeline

Commands run, in order (using `@gltf-transform/cli`):

```bash
npx @gltf-transform/cli inspect raw/model.glb
# npx @gltf-transform/cli simplify ...
# npx @gltf-transform/cli meshopt ...
# npx @gltf-transform/cli ktx2 ... (or webp)
npx @gltf-transform/cli inspect optimised/model.glb
```

## Results: single model

| Metric | Before | After | Change |
|---|---|---|---|
| File size | | | |
| Triangles | | | |
| Draw calls | | | |
| Texture memory | | | |
| Load time (throttled to 10 Mbps) | | | |
| Frame time | | | |

## Results: 500 items, instancing

| Rendering | Draw calls | FPS | Frame time |
|---|---|---|---|
| One mesh per item | | | |
| One `InstancedMesh` per type | | | |

## How measured

- Hardware:
- Browser and version:
- Window size:
- How load time was throttled (Chrome DevTools network preset):
- How draw calls were read (`renderer.info.render.calls`):

## Notes and trade-offs

- Visual quality loss from simplification:
- Decode cost (Meshopt vs Draco):
- What I would do next in a real pipeline:
