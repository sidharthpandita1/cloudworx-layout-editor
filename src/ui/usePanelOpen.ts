import { useState } from 'react'

export type Side = 'left' | 'right'

const STORAGE_KEY = 'layout-editor.closed-panels'

/**
 * Open or closed, per side. Remembered in this browser (a convenience only: if storage is blocked,
 * both panels simply start open).
 */
export function usePanelOpen(side: Side): [boolean, () => void] {
  const [open, setOpen] = useState(() => !readClosed().includes(side))
  function toggle() {
    const next = !open
    setOpen(next)
    const others = readClosed().filter((closed) => closed !== side)
    writeClosed(next ? others : [...others, side])
  }
  return [open, toggle]
}

function readClosed(): Side[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((side): side is Side => side === 'left' || side === 'right') : []
  } catch {
    return []
  }
}

function writeClosed(sides: Side[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sides))
  } catch {
    // ignore: see readClosed
  }
}
