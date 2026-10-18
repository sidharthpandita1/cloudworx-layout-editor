import { useId, useState } from 'react'
import { CATALOG } from '../domain/catalog'
import type { PlacedItem, QuarterTurns } from '../domain/types'
import type { Locale } from '../i18n'
import { formatNumber, itemLabel, parseNumber } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'
import { useTranslate } from './useTranslate'

const ROTATIONS: QuarterTurns[] = [0, 1, 2, 3]

/** Shows the selected item. Editing x, z or rotation goes through the store, so it snaps and can be undone. */
export function PropertiesPanel() {
  const t = useTranslate()
  const item = useEditorStore((state) => state.items.find((item) => item.id === state.selectedId))
  const locale = useEditorStore((state) => state.locale)
  const isDragging = useEditorStore((state) => state.drag !== null)

  if (!item) return <p className="muted">{t('empty.selection')}</p>

  // key: selecting another item gives fresh fields, so a half-typed value is never applied to it.
  return <ItemProperties key={item.id} item={item} locale={locale} disabled={isDragging} />
}

function ItemProperties({ item, locale, disabled }: { item: PlacedItem; locale: Locale; disabled: boolean }) {
  const t = useTranslate()
  const rotationId = useId()
  const { moveItem, rotateItem } = useEditorStore.getState()

  return (
    <div className="properties">
      <dl>
        <dt>{t('props.type')}</dt>
        <dd>{t(CATALOG[item.typeId].nameKey)}</dd>
        <dt>{t('props.name')}</dt>
        <dd>{itemLabel(locale, item)}</dd>
      </dl>

      <CoordinateField
        label={t('props.x')}
        value={item.x}
        locale={locale}
        disabled={disabled}
        onCommit={(x) => moveItem(item.id, { x, z: item.z })}
      />
      <CoordinateField
        label={t('props.z')}
        value={item.z}
        locale={locale}
        disabled={disabled}
        onCommit={(z) => moveItem(item.id, { x: item.x, z })}
      />

      <div className="field">
        <label htmlFor={rotationId}>{t('props.rotation')}</label>
        <select
          id={rotationId}
          value={item.rotation}
          disabled={disabled}
          onChange={(event) => rotateItem(item.id, Number(event.target.value) as QuarterTurns)}
        >
          {ROTATIONS.map((turns) => (
            <option key={turns} value={turns}>
              {turns * 90}°
            </option>
          ))}
        </select>
      </div>

      <p className="muted">{t('props.hint')}</p>
    </div>
  )
}

interface CoordinateFieldProps {
  label: string
  value: number
  locale: Locale
  disabled: boolean
  onCommit: (value: number) => void
}

/**
 * A text field for a position in metres. Typing changes only the field; Enter or leaving the field
 * applies it as one move (one undo step), and Esc puts the old value back. The field then shows the
 * stored value, which is snapped. Text that isn't a number simply reverts.
 */
function CoordinateField({ label, value, locale, disabled, onCommit }: CoordinateFieldProps) {
  const id = useId()
  // The text being typed, or null when not editing (the field then shows the stored value).
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const parsed = parseNumber(draft)
    setDraft(null)
    if (parsed !== null) onCommit(parsed)
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? formatNumber(locale, value)}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          else if (event.key === 'Escape') setDraft(null)
        }}
      />
    </div>
  )
}
