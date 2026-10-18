import { describe, expect, it } from 'vitest'
import type { PlacedItem } from '../domain/types'
import { describeCommand, describeSelection } from './announce'

const cabinet: PlacedItem = { id: 'cabinet-2', typeId: 'cabinet', number: 2, x: 3.5, z: -1.25, rotation: 1 }

describe('describeCommand', () => {
  it('describes each kind of edit', () => {
    expect(describeCommand('en', { type: 'add', item: cabinet, index: 0 }, [cabinet])).toBe(
      'Cabinet 2 placed at x 3.5, z -1.25.',
    )
    expect(describeCommand('en', { type: 'delete', item: cabinet, index: 0 }, [])).toBe('Cabinet 2 deleted.')
    expect(
      describeCommand('en', { type: 'move', id: 'cabinet-2', from: { x: 3, z: -1.25 }, to: { x: 3.5, z: -1.25 } }, [cabinet]),
    ).toBe('Cabinet 2 moved to x 3.5, z -1.25.')
    expect(describeCommand('en', { type: 'rotate', id: 'cabinet-2', from: 0, to: 1 }, [cabinet])).toBe(
      'Cabinet 2 rotated to 90°.',
    )
  })

  it('describes a batch part by part', () => {
    const batch = {
      type: 'batch' as const,
      commands: [
        { type: 'rotate' as const, id: 'cabinet-2', from: 0 as const, to: 1 as const },
        { type: 'move' as const, id: 'cabinet-2', from: { x: 3.25, z: -1 }, to: { x: 3.5, z: -1.25 } },
      ],
    }
    expect(describeCommand('en', batch, [cabinet])).toBe('Cabinet 2 rotated to 90°. Cabinet 2 moved to x 3.5, z -1.25.')
  })

  it('speaks Vietnamese, with decimal commas', () => {
    expect(
      describeCommand('vi', { type: 'move', id: 'cabinet-2', from: { x: 3, z: -1.25 }, to: { x: 3.5, z: -1.25 } }, [cabinet]),
    ).toBe('Đã di chuyển Tủ điện 2 đến x 3,5, z -1,25.')
  })
})

describe('describeSelection', () => {
  it('names the item with its position and rotation', () => {
    expect(describeSelection('en', cabinet)).toBe('Cabinet 2 selected, x 3.5, z -1.25, 90°.')
  })
})
