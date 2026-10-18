import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEditorStore } from '../store/editorStore'
import { urlOptions } from '../urlOptions'
import { Floor } from './Floor'
import { Items } from './ItemInstances'
import { ProposalPreview } from './ProposalPreview'
import { RenderInfo } from './RenderInfo'
import { SelectionOutline } from './SelectionOutline'

// Open the app with ?stats to show the FPS meter and draw calls (used for the README measurement).
const showStats = urlOptions.has('stats')

/**
 * A click on the background (nothing hit) clears the selection, like a click on empty floor.
 * R3F only reports a miss if the pointer moved 2 px or less, so camera drags don't deselect.
 */
function handlePointerMissed() {
  const { activeTool, select } = useEditorStore.getState()
  if (!activeTool) select(null)
}

export function EditorCanvas() {
  return (
    // dpr capped at 1.5 to keep fill-rate manageable on integrated graphics.
    <Canvas camera={{ position: [0, 14, 14], fov: 45 }} dpr={[1, 1.5]} onPointerMissed={handlePointerMissed}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} />
      <Floor />
      <Items />
      <SelectionOutline />
      <ProposalPreview />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} />
      {showStats && <Stats className="stats" />}
      {showStats && <RenderInfo />}
    </Canvas>
  )
}
