export const en = {
  'app.title': 'Layout Editor',
  'app.switchLanguage': 'Tiếng Việt',
  'panel.palette': 'Palette',
  'panel.items': 'Placed items',
  'panel.properties': 'Properties',
  'panel.bom': 'Bill of materials',
  'toolbar.label': 'Edit',
  'toolbar.undo': 'Undo',
  'toolbar.redo': 'Redo',
  'toolbar.rotate': 'Rotate',
  'toolbar.delete': 'Delete',
  'palette.hint': 'Click the floor to place. Press Esc to stop.',
  'item.cabinet': 'Cabinet',
  'item.drive': 'Drive',
  'item.transformer': 'Transformer',
  'empty.items': 'No items placed yet.',
  'empty.selection': 'Select an item to see its properties.',
  'empty.bom': 'The bill of materials is empty.',
} as const

export type MessageKey = keyof typeof en
