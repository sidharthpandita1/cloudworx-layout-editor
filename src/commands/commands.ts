import type { PlacedItem, Position, QuarterTurns } from '../domain/types'

/**
 * One undoable edit to the layout.
 *
 * Commands are plain data rather than functions, so the same objects can be kept in the undo
 * history, sent to a server, or proposed by an assistant as JSON and validated before use.
 * `add` and `delete` carry the list index so undo restores the original list order.
 */
export type Command =
  | { type: 'add'; item: PlacedItem; index: number }
  | { type: 'delete'; item: PlacedItem; index: number }
  | { type: 'move'; id: string; from: Position; to: Position }
  | { type: 'rotate'; id: string; from: QuarterTurns; to: QuarterTurns }
  | { type: 'batch'; commands: Command[] }

/** Returns the items after applying the command. Never mutates the input. */
export function applyCommand(items: PlacedItem[], command: Command): PlacedItem[] {
  switch (command.type) {
    case 'add':
      return items.toSpliced(command.index, 0, command.item)
    case 'delete':
      return items.filter((item) => item.id !== command.item.id)
    case 'move':
      return updateItem(items, command.id, command.to)
    case 'rotate':
      return updateItem(items, command.id, { rotation: command.to })
    case 'batch':
      return command.commands.reduce(applyCommand, items)
  }
}

/** Returns the command that undoes this one. */
export function invertCommand(command: Command): Command {
  switch (command.type) {
    case 'add':
      return { type: 'delete', item: command.item, index: command.index }
    case 'delete':
      return { type: 'add', item: command.item, index: command.index }
    case 'move':
      return { ...command, from: command.to, to: command.from }
    case 'rotate':
      return { ...command, from: command.to, to: command.from }
    case 'batch':
      // Undo the last step first.
      return { type: 'batch', commands: command.commands.map(invertCommand).toReversed() }
  }
}

function updateItem(
  items: PlacedItem[],
  id: string,
  changes: Partial<Pick<PlacedItem, 'x' | 'z' | 'rotation'>>,
): PlacedItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...changes } : item))
}
