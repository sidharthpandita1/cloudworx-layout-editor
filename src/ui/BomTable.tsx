import { useMemo } from 'react'
import { billOfMaterials } from '../domain/bom'
import { CATALOG } from '../domain/catalog'
import { CELL_SIZE } from '../domain/grid'
import type { ItemType } from '../domain/types'
import type { Locale } from '../i18n'
import { formatNumber } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'
import { useTranslate } from './useTranslate'

/** Bill of materials: how many of each item type the layout uses. Counted from the items, never stored. */
export function BomTable() {
  const t = useTranslate()
  const items = useEditorStore((state) => state.items)
  const locale = useEditorStore((state) => state.locale)
  const bom = useMemo(() => billOfMaterials(items), [items])

  if (bom.total === 0) return <p className="muted">{t('empty.bom')}</p>

  return (
    <table className="bom">
      <thead>
        <tr>
          <th scope="col">{t('bom.item')}</th>
          <th scope="col">{t('bom.size')}</th>
          <th scope="col" className="number">
            {t('bom.quantity')}
          </th>
        </tr>
      </thead>
      <tbody>
        {bom.lines.map(({ typeId, quantity }) => (
          <tr key={typeId}>
            <th scope="row">
              <span className="swatch" style={{ background: CATALOG[typeId].color }} aria-hidden />
              {t(CATALOG[typeId].nameKey)}
            </th>
            <td>{formatSize(locale, CATALOG[typeId])}</td>
            <td className="number">{formatNumber(locale, quantity)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={2}>
            {t('bom.total')}
          </th>
          <td className="number">{formatNumber(locale, bom.total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

/** Width × depth × height in metres, as listed in the catalog (before any rotation). */
function formatSize(locale: Locale, type: ItemType): string {
  return [type.widthCells * CELL_SIZE, type.depthCells * CELL_SIZE, type.height]
    .map((metres) => formatNumber(locale, metres))
    .join(' × ')
}
