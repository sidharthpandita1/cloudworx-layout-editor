import { describe, expect, it } from 'vitest'
import type { PlacedItem } from '../domain/types'
import { applyCommand, invertCommand, type Command } from './commands'

function makeItem(id: string, x = 0, z = 0): PlacedItem {
  return { id, typeId: 'cabinet', number: 1, x, z, rotation: 0 }
}

/** Freezes the array and every item so any mutation throws. */
function frozen(items: PlacedItem[]): PlacedItem[] {
  return Object.freeze(items.map((item) => Object.freeze(item))) as PlacedItem[]
}

const a = makeItem('a', 0, 0)
const b = makeItem('b', 1, 1)
const c = makeItem('c', 2, 2)

const roundTripCases: [string, PlacedItem[], Command][] = [
  ['add', [a, b], { type: 'add', item: c, index: 1 }],
  ['delete', [a, b, c], { type: 'delete', item: b, index: 1 }],
  ['move', [a, b], { type: 'move', id: 'a', from: { x: 0, z: 0 }, to: { x: 3.5, z: -1 } }],
  ['rotate', [a, b], { type: 'rotate', id: 'b', from: 0, to: 1 }],
  [
    'batch',
    [a, b],
    {
      type: 'batch',
      commands: [
        { type: 'move', id: 'a', from: { x: 0, z: 0 }, to: { x: 1, z: 0 } },
        { type: 'rotate', id: 'b', from: 0, to: 3 },
        { type: 'add', item: c, index: 2 },
      ],
    },
  ],
]

describe('applyCommand + invertCommand', () => {
  it.each(roundTripCases)('%s: undo returns the original items', (_name, before, command) => {
    const after = applyCommand(frozen(before), command)
    expect(after).not.toEqual(before)
    expect(applyCommand(frozen(after), invertCommand(command))).toEqual(before)
  })

  it.each(roundTripCases)('%s: redo after undo gives the same result again', (_name, before, command) => {
    const after = applyCommand(before, command)
    const undone = applyCommand(after, invertCommand(command))
    expect(applyCommand(undone, command)).toEqual(after)
  })
})

describe('applyCommand', () => {
  it('add inserts at the given index', () => {
    expect(applyCommand([a, b], { type: 'add', item: c, index: 1 })).toEqual([a, c, b])
  })

  it('undoing a delete puts the item back at its original index', () => {
    const remove: Command = { type: 'delete', item: b, index: 1 }
    const after = applyCommand([a, b, c], remove)
    expect(after).toEqual([a, c])
    expect(applyCommand(after, invertCommand(remove))).toEqual([a, b, c])
  })

  it('leaves other items untouched (same object references)', () => {
    const after = applyCommand([a, b], { type: 'move', id: 'a', from: { x: 0, z: 0 }, to: { x: 1, z: 1 } })
    expect(after[1]).toBe(b)
  })
})

describe('invertCommand for batch', () => {
  it('undoes steps in reverse order', () => {
    // Two moves of the same item: undoing them in the wrong order would leave it at x = 1.
    const batch: Command = {
      type: 'batch',
      commands: [
        { type: 'move', id: 'a', from: { x: 0, z: 0 }, to: { x: 1, z: 0 } },
        { type: 'move', id: 'a', from: { x: 1, z: 0 }, to: { x: 2, z: 0 } },
      ],
    }
    const after = applyCommand([a], batch)
    expect(after[0].x).toBe(2)
    expect(applyCommand(after, invertCommand(batch))[0].x).toBe(0)
  })
})
