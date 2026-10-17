import type { MessageKey } from '../i18n'

export type ItemTypeId = 'cabinet' | 'drive' | 'transformer'

/** Rotation in quarter turns: 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°. See docs/ASSUMPTIONS.md. */
export type QuarterTurns = 0 | 1 | 2 | 3

/** A kind of equipment in the palette. Footprints are whole grid cells. */
export interface ItemType {
  id: ItemTypeId
  nameKey: MessageKey
  widthCells: number // along x when rotation is 0
  depthCells: number // along z when rotation is 0
  height: number // metres
  color: string
}

/** One item placed on the floor. Positions are the footprint centre, in metres. */
export interface PlacedItem {
  id: string
  typeId: ItemTypeId
  label: string // human-readable name used in messages, e.g. "Cabinet 3"
  x: number
  z: number
  rotation: QuarterTurns
}
