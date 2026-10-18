import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/** How often the numbers are refreshed. Updating text every frame would itself cost time. */
const REFRESH_MS = 500

/**
 * Developer overlay (with `?stats`): draw calls and triangles in the last frame, under the FPS meter.
 * It writes straight to a DOM element instead of React state, so measuring doesn't cause re-renders.
 */
export function RenderInfo() {
  const gl = useThree((state) => state.gl)
  const label = useRef<HTMLDivElement | null>(null)
  const lastUpdate = useRef(0)

  useEffect(() => {
    const element = document.createElement('div')
    element.className = 'render-info'
    element.setAttribute('aria-hidden', 'true')
    document.body.append(element)
    label.current = element
    return () => element.remove()
  }, [])

  useFrame(() => {
    const now = performance.now()
    if (!label.current || now - lastUpdate.current < REFRESH_MS) return
    lastUpdate.current = now
    // three.js resets these counters at the start of each frame, so here they describe the last one.
    const { calls, triangles } = gl.info.render
    label.current.textContent = `draw calls ${calls} · triangles ${triangles.toLocaleString('en')}`
  })

  return null
}
