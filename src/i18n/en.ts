export const en = {
  'app.title': 'Layout Editor',
  'app.switchLanguage': 'Tiếng Việt',
  'panel.palette': 'Palette',
  'panel.items': 'Placed items',
  'panel.properties': 'Properties',
  'panel.bom': 'Bill of materials',
  'item.cabinet': 'Cabinet',
  'item.drive': 'Drive',
  'item.transformer': 'Transformer',
  'empty.items': 'No items placed yet.',
  'empty.selection': 'Select an item to see its properties.',
  'empty.bom': 'The bill of materials is empty.',
} as const

export type MessageKey = keyof typeof en
