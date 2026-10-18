import { OrbitControls, Stats, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Matrix4, type BufferGeometry, type InstancedMesh, type Material, type Mesh, type Object3D } from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MODEL_KINDS, gridPositions, readSettings, settingsQuery, type BenchSettings, type ModelKind } from './settings'

const BASE = import.meta.env.BASE_URL
// Optimised files, from `npm run model:variants`.
const OPTIMISED_URLS: Record<Exclude<ModelKind, 'raw'>, string> = {
  meshopt: `${BASE}models/flight-helmet.glb`,
  'meshopt-512': `${BASE}models/flight-helmet-512.glb`,
}
// The raw model is not in the repo. `npm run model:fetch` puts it here; otherwise it comes from Khronos.
const LOCAL_RAW_URL = `${BASE}models/raw/FlightHelmet/FlightHelmet.gltf`
const REMOTE_RAW_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF/FlightHelmet.gltf'
const SPACING = 0.8 // metres between copies

// Load time counts from here (the page's script starting) to the first frame drawn with the model.
const pageStart = performance.now()

/** Results the measurement script reads. */
declare global {
  interface Window {
    benchResult?: { loadMs: number; settings: BenchSettings; url: string }
  }
}

/**
 * Developer page for the 3D model optimisation report (docs/OPTIMISATION.md): the Flight Helmet,
 * raw (48 MB) or one of the optimised versions, as 1 or 500 copies, with or without instancing. English only:
 * it is a measuring tool, not part of the product.
 */
export function ModelBench() {
  const settings = useMemo(() => readSettings(window.location.search), [])
  const url = useModelUrl(settings.model)

  return (
    <div className="bench">
      <aside className="bench-panel">
        <h1>Model optimisation benchmark</h1>
        <SettingLinks settings={settings} />
        <dl>
          <dt>File</dt>
          <dd className="mono">{url ?? 'checking…'}</dd>
          <dt>Load to first frame</dt>
          <dd id="bench-load">loading…</dd>
          <dt>Last frame</dt>
          <dd id="bench-render">–</dd>
        </dl>
        <p className="muted">
          Flight Helmet by Gary Hsu, Khronos glTF Sample Assets, CC0. FPS meter: bottom left. Each link reloads
          the page, so every measurement starts cold.
        </p>
      </aside>
      <main className="bench-view">
        {url && (
          <Canvas camera={cameraFor(settings.copies)} dpr={[1, 1.5]}>
            <hemisphereLight args={['#ffffff', '#555566', 1.2]} />
            <directionalLight position={[3, 6, 4]} intensity={2} />
            <Suspense fallback={null}>
              <Model url={url} settings={settings} />
            </Suspense>
            <RenderReadout />
            <OrbitControls makeDefault target={settings.copies === 1 ? [0, 0.35, 0] : [0, 0, 0]} />
            <Stats className="bench-stats" />
          </Canvas>
        )}
      </main>
    </div>
  )
}

function SettingLinks({ settings }: { settings: BenchSettings }) {
  const option = (label: string, change: Partial<BenchSettings>) => {
    const next = { ...settings, ...change }
    const current = settingsQuery(next) === settingsQuery(settings)
    return (
      <a key={label} href={settingsQuery(next)} aria-current={current ? 'page' : undefined}>
        {label}
      </a>
    )
  }
  return (
    <div className="bench-options">
      <span>Model</span>
      <span className="bench-models">{MODEL_KINDS.map((model) => option(model, { model }))}</span>
      <span>Copies</span>
      {option('1', { copies: 1 })}
      {option('500', { copies: 500 })}
      <span>Instancing</span>
      {option('On', { instancing: true })}
      {option('Off', { instancing: false })}
    </div>
  )
}

/** Picks the local raw copy if it exists, else the Khronos original. The optimised file is always local. */
function useModelUrl(model: ModelKind): string | null {
  const [url, setUrl] = useState<string | null>(model === 'raw' ? null : OPTIMISED_URLS[model])
  useEffect(() => {
    if (model !== 'raw') return
    fetch(LOCAL_RAW_URL, { method: 'HEAD' })
      .then((response) => setUrl(response.ok && !response.headers.get('content-type')?.includes('html') ? LOCAL_RAW_URL : REMOTE_RAW_URL))
      .catch(() => setUrl(REMOTE_RAW_URL))
  }, [model])
  return url
}

function cameraFor(copies: number) {
  return copies === 1
    ? { position: [0.9, 0.7, 1.1] as [number, number, number], fov: 40 }
    : { position: [0, 12, 15] as [number, number, number], fov: 45 }
}

function Model({ url, settings }: { url: string; settings: BenchSettings }) {
  const gl = useThree((state) => state.gl)
  // No Draco; useMeshopt = true (the decoder is a few KB of JavaScript, bundled). KTX2 textures need the
  // Basis transcoder; three.js bundles it with KTX2Loader, and detectSupport picks the best GPU format
  // for this device.
  const { scene } = useGLTF(url, false, true, (loader) => {
    const ktx2 = new KTX2Loader().detectSupport(gl)
    loader.setKTX2Loader(ktx2 as unknown as Parameters<typeof loader.setKTX2Loader>[0])
  })
  const positions = useMemo(() => gridPositions(settings.copies, SPACING), [settings.copies])
  useReportLoadTime(url, settings)

  if (settings.copies === 1) return <primitive object={scene} />
  return settings.instancing ? <InstancedCopies scene={scene} positions={positions} /> : <ClonedCopies scene={scene} positions={positions} />
}

/** Without instancing: a full copy of the scene graph per position. Draw calls = copies × meshes. */
function ClonedCopies({ scene, positions }: { scene: Object3D; positions: [number, number, number][] }) {
  // clone() shares geometry and materials, so memory stays the same; only the draw calls multiply.
  const copies = useMemo(() => positions.map((_, i) => (i === 0 ? scene : scene.clone())), [scene, positions])
  return copies.map((copy, i) => <primitive key={i} object={copy} position={positions[i]} />)
}

interface Part {
  geometry: BufferGeometry
  material: Material | Material[]
  matrix: Matrix4 // the mesh's placement inside the model
}

/** With instancing: one InstancedMesh per mesh in the model. Draw calls = meshes, whatever the copies. */
function InstancedCopies({ scene, positions }: { scene: Object3D; positions: [number, number, number][] }) {
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true)
    const found: Part[] = []
    scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) found.push({ geometry: mesh.geometry, material: mesh.material, matrix: mesh.matrixWorld.clone() })
    })
    return found
  }, [scene])
  return parts.map((part, i) => <InstancedPart key={i} part={part} positions={positions} />)
}

function InstancedPart({ part, positions }: { part: Part; positions: [number, number, number][] }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const placement = new Matrix4()
    positions.forEach(([x, y, z], i) => {
      placement.makeTranslation(x, y, z).multiply(part.matrix)
      mesh.setMatrixAt(i, placement)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [part, positions])
  return <instancedMesh ref={ref} args={[part.geometry, part.material, positions.length]} />
}

/** Records the time from page start to the first frame drawn with the model in the scene. */
function useReportLoadTime(url: string, settings: BenchSettings) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    const loadMs = Math.round(performance.now() - pageStart)
    window.benchResult = { loadMs, settings, url }
    const label = document.getElementById('bench-load')
    if (label) label.textContent = `${loadMs.toLocaleString('en')} ms`
  })
}

/** Draw calls, triangles and GPU textures in the last frame, refreshed twice a second. */
function RenderReadout() {
  const gl = useThree((state) => state.gl)
  const lastUpdate = useRef(0)
  useFrame(() => {
    const now = performance.now()
    if (now - lastUpdate.current < 500) return
    lastUpdate.current = now
    const label = document.getElementById('bench-render')
    const { calls, triangles } = gl.info.render
    if (label) {
      label.textContent = `${calls.toLocaleString('en')} draw calls · ${triangles.toLocaleString('en')} triangles · ${gl.info.memory.textures} textures`
    }
  })
  return null
}
