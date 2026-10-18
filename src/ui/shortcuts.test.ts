import { describe, expect, it } from 'vitest'
import { BIG_MOVE, isInListbox, isTypingTarget, moveFor, shortcutFor } from './shortcuts'

function press(key: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) {
  return shortcutFor({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers })
}

describe('shortcutFor', () => {
  it('undo with Ctrl+Z (Windows) and Cmd+Z (Mac)', () => {
    expect(press('z', { ctrlKey: true })).toBe('undo')
    expect(press('z', { metaKey: true })).toBe('undo')
  })

  it('redo with Ctrl/Cmd+Shift+Z and Ctrl+Y', () => {
    // With Shift held, browsers report the key as upper-case "Z".
    expect(press('Z', { ctrlKey: true, shiftKey: true })).toBe('redo')
    expect(press('Z', { metaKey: true, shiftKey: true })).toBe('redo')
    expect(press('y', { ctrlKey: true })).toBe('redo')
  })

  it('rotate with R, in either case', () => {
    expect(press('r')).toBe('rotate')
    expect(press('R', { shiftKey: true })).toBe('rotate')
  })

  it('delete with Delete or Backspace', () => {
    expect(press('Delete')).toBe('delete')
    expect(press('Backspace')).toBe('delete')
  })

  it('escape', () => {
    expect(press('Escape')).toBe('escape')
  })

  it('help with ?', () => {
    expect(press('?', { shiftKey: true })).toBe('help')
  })

  it('leaves browser shortcuts alone', () => {
    expect(press('r', { ctrlKey: true })).toBeNull() // reload
    expect(press('r', { metaKey: true })).toBeNull()
    expect(press('Backspace', { metaKey: true })).toBeNull()
    expect(press('r', { altKey: true })).toBeNull()
  })

  it('ignores other keys', () => {
    expect(press('z')).toBeNull()
    expect(press('a')).toBeNull()
  })
})

describe('moveFor', () => {
  const arrow = (key: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) =>
    moveFor({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers })

  it('moves one cell along the fixed floor axes', () => {
    expect(arrow('ArrowLeft')).toEqual({ x: -0.5, z: 0 })
    expect(arrow('ArrowRight')).toEqual({ x: 0.5, z: 0 })
    expect(arrow('ArrowUp')).toEqual({ x: 0, z: -0.5 }) // towards the back wall
    expect(arrow('ArrowDown')).toEqual({ x: 0, z: 0.5 })
  })

  it('moves 2 m with Shift', () => {
    expect(arrow('ArrowRight', { shiftKey: true })).toEqual({ x: BIG_MOVE, z: 0 })
  })

  it('leaves Ctrl/Cmd/Alt + arrow and other keys alone', () => {
    expect(arrow('ArrowLeft', { metaKey: true })).toBeNull() // Cmd+← is "back" in some browsers
    expect(arrow('ArrowLeft', { altKey: true })).toBeNull()
    expect(arrow('a')).toBeNull()
  })
})

describe('isInListbox', () => {
  it('is true inside an element with role="listbox"', () => {
    const inside = { closest: (selector: string) => (selector === '[role="listbox"]' ? {} : null) }
    expect(isInListbox(inside as unknown as EventTarget)).toBe(true)
    expect(isInListbox({ closest: () => null } as unknown as EventTarget)).toBe(false)
    expect(isInListbox({} as EventTarget)).toBe(false) // e.g. window: no closest()
  })
})

describe('isTypingTarget', () => {
  it('is true for text fields and editable content', () => {
    expect(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true)
  })

  it('is false for buttons, the canvas and the page', () => {
    expect(isTypingTarget({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false)
    expect(isTypingTarget({ tagName: 'CANVAS' } as unknown as EventTarget)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
