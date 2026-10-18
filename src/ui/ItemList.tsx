import { memo, useEffect, useRef } from 'react'
import { CATALOG } from '../domain/catalog'
import type { PlacedItem } from '../domain/types'
import type { Locale } from '../i18n'
import { formatNumber, itemLabel } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'
import { useViolations } from '../store/violations'
import { useTranslate } from './useTranslate'

/**
 * Placed items, in the order they were placed. Clicking a row selects the item; selecting it in 3D
 * highlights its row and scrolls to it. Both directions use the same `selectedId` in the store.
 */
export function ItemList() {
  const t = useTranslate()
  const items = useEditorStore((state) => state.items)
  const selectedId = useEditorStore((state) => state.selectedId)
  const locale = useEditorStore((state) => state.locale)
  const { violatingIds } = useViolations()

  if (items.length === 0) return <p className="muted">{t('empty.items')}</p>

  return (
    <ul className="item-list">
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          locale={locale}
          selected={item.id === selectedId}
          violating={violatingIds.has(item.id)}
        />
      ))}
    </ul>
  )
}

interface ItemRowProps {
  item: PlacedItem
  locale: Locale
  selected: boolean
  violating: boolean
}

// memo: during a drag the violations change on every cell, but only the rows whose props changed re-render.
const ItemRow = memo(function ItemRow({ item, locale, selected, violating }: ItemRowProps) {
  const t = useTranslate()
  const rowRef = useRef<HTMLButtonElement>(null)
  const { select } = useEditorStore.getState()

  // When the item is selected somewhere else (in 3D, or just placed), bring its row into view.
  // 'nearest' leaves a row that is already visible where it is, so clicking a row never jumps.
  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <li>
      <button ref={rowRef} type="button" aria-current={selected} onClick={() => select(item.id)}>
        <span className="swatch" style={{ background: CATALOG[item.typeId].color }} aria-hidden />
        <span className="item-name">
          {itemLabel(locale, item)}
          {violating && (
            <span className="warning-badge" role="img" aria-label={t('rule.rowWarning')} title={t('rule.rowWarning')}>
              ⚠
            </span>
          )}
        </span>
        <span className="item-position">
          x {formatNumber(locale, item.x)} · z {formatNumber(locale, item.z)}
        </span>
      </button>
    </li>
  )
})
