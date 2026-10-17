import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Floor } from './Floor'

// Open the app with ?stats to show the FPS counter (used for the README measurement).
const showStats = new URLSearchParams(window.location.search).has('stats')

export function EditorCanvas() {
  return (
    // dpr capped at 1.5 to keep fill-rate manageable on integrated graphics.
    <Canvas camera={{ position: [0, 14, 14], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} />
      <Floor />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} />
      {showStats && <Stats />}
    </Canvas>
  )
}
