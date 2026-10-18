import type { Command } from '../commands/commands'
import type { PlacedItem } from '../domain/types'
import { formatNumber, itemLabel } from './format'
import { translate, type Locale } from './index'

/**
 * A sentence for screen readers describing an edit, e.g. "Cabinet 2 moved to x 3.5, z -1.".
 * Built from the command itself, so a mouse drag, an arrow key and an undo are all described the same
 * way. `items` is the layout after the command, used to name items that the command refers to by id.
 */
export function describeCommand(locale: Locale, command: Command, items: PlacedItem[]): string {
  const name = (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    return item ? itemLabel(locale, item) : id
  }
  const at = (x: number, z: number) => ({ x: formatNumber(locale, x), z: formatNumber(locale, z) })

  switch (command.type) {
    case 'add':
      return translate(locale, 'announce.placed', { item: itemLabel(locale, command.item), ...at(command.item.x, command.item.z) })
    case 'delete':
      return translate(locale, 'announce.deleted', { item: itemLabel(locale, command.item) })
    case 'move':
      return translate(locale, 'announce.moved', { item: name(command.id), ...at(command.to.x, command.to.z) })
    case 'rotate':
      return translate(locale, 'announce.rotated', { item: name(command.id), degrees: command.to * 90 })
    case 'batch':
      // e.g. a rotation that also shifted the item: "… rotated to 90°. … moved to x 1.25, z 0."
      return command.commands.map((part) => describeCommand(locale, part, items)).join(' ')
  }
}

/** "Cabinet 2 selected, x 3.5, z -1, 90°." */
export function describeSelection(locale: Locale, item: PlacedItem): string {
  return translate(locale, 'announce.selected', {
    item: itemLabel(locale, item),
    x: formatNumber(locale, item.x),
    z: formatNumber(locale, item.z),
    degrees: item.rotation * 90,
  })
}
