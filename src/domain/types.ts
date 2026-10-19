export type ItemTypeId = 'cabinet' | 'drive' | 'transformer'

/** Rotation in quarter turns: 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°. See docs/ASSUMPTIONS.md. */
export type QuarterTurns = 0 | 1 | 2 | 3

/** A kind of equipment in the palette. Footprints are whole grid cells. */
export interface ItemType {
  id: ItemTypeId
  nameKey: `item.${ItemTypeId}` // translation key; the typecheck fails where it is used if en.ts lacks it
  widthCells: number // along x when rotation is 0
  depthCells: number // along z when rotation is 0
  height: number // metres
  color: string
}

/** A point on the floor, in metres. */
export interface Position {
  x: number
  z: number
}

/** One item placed on the floor. Positions are the footprint centre, in metres. */
export interface PlacedItem {
  id: string
  typeId: ItemTypeId
  // Per-type sequence number, shown as "<translated type name> <number>", e.g. "Cabinet 3".
  // Never reused after a delete, so messages that name items stay unambiguous.
  number: number
  x: number
  z: number
  rotation: QuarterTurns
}
