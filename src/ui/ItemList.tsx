import { memo, useEffect, useRef, type KeyboardEvent } from 'react'
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
 *
 * Keyboard: the list is one Tab stop (the ARIA listbox pattern). ↑/↓ select the previous/next item,
 * Home/End the first/last. Focus stays on the list; `aria-activedescendant` tells screen readers which
 * row is current, so 500 rows don't mean 500 Tab presses.
 */
export function ItemList({ labelledBy }: { labelledBy: string }) {
  const t = useTranslate()
  const items = useEditorStore((state) => state.items)
  const selectedId = useEditorStore((state) => state.selectedId)
  const locale = useEditorStore((state) => state.locale)
  const { violatingIds } = useViolations()

  if (items.length === 0) return <p className="muted">{t('empty.items')}</p>

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const index = items.findIndex((item) => item.id === selectedId)
    let next: number | null = null
    if (event.key === 'ArrowDown') next = index === -1 ? 0 : Math.min(index + 1, items.length - 1)
    else if (event.key === 'ArrowUp') next = index === -1 ? items.length - 1 : Math.max(index - 1, 0)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next === null) return
    event.preventDefault() // don't scroll the panel; the selected row scrolls into view by itself
    useEditorStore.getState().select(items[next].id)
  }

  return (
    <>
      <p id="item-list-help" className="visually-hidden">
        {t('list.help')}
      </p>
      <ul
        className="item-list"
        role="listbox"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-describedby="item-list-help"
        aria-activedescendant={selectedId ? rowId(selectedId) : undefined}
        onKeyDown={handleKeyDown}
      >
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
    </>
  )
}

function rowId(itemId: string) {
  return `item-row-${itemId}`
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
  const rowRef = useRef<HTMLLIElement>(null)
  const { select } = useEditorStore.getState()

  // When the item is selected somewhere else (in 3D, by keyboard, or just placed), bring its row into
  // view. 'nearest' leaves a row that is already visible where it is, so clicking a row never jumps.
  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <li ref={rowRef} id={rowId(item.id)} role="option" aria-selected={selected} onClick={() => select(item.id)}>
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
    </li>
  )
})
