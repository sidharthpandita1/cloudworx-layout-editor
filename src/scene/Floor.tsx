import { Grid } from '@react-three/drei'
import { CELL_SIZE, FLOOR_DEPTH, FLOOR_WIDTH } from '../domain/grid'

/** The 20 m × 12 m floor with 0.5 m cells and a darker line every metre. */
export function Floor() {
  return (
    <group>
      <mesh name="floor" rotation-x={-Math.PI / 2}>
        <planeGeometry args={[FLOOR_WIDTH, FLOOR_DEPTH]} />
        <meshStandardMaterial color="#eef1f5" />
      </mesh>
      <Grid
        args={[FLOOR_WIDTH, FLOOR_DEPTH]}
        position-y={0.001}
        cellSize={CELL_SIZE}
        cellColor="#c3cad5"
        sectionSize={1}
        sectionColor="#8893a5"
        fadeDistance={200}
      />
    </group>
  )
}
