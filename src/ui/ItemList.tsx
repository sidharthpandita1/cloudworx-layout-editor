import { useEffect, useRef } from 'react'
import { CATALOG } from '../domain/catalog'
import type { PlacedItem } from '../domain/types'
import type { Locale } from '../i18n'
import { formatNumber, itemLabel } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'
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

  if (items.length === 0) return <p className="muted">{t('empty.items')}</p>

  return (
    <ul className="item-list">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} locale={locale} selected={item.id === selectedId} />
      ))}
    </ul>
  )
}

function ItemRow({ item, locale, selected }: { item: PlacedItem; locale: Locale; selected: boolean }) {
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
        {itemLabel(locale, item)}
        <span className="item-position">
          x {formatNumber(locale, item.x)} · z {formatNumber(locale, item.z)}
        </span>
      </button>
    </li>
  )
}
