import { useMemo } from 'react'
import type { PlacedItem } from '../domain/types'
import { formatViolation, formatViolationCount } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'
import { useViolations } from '../store/violations'
import { useTranslate } from './useTranslate'

/** Messages shown at most; a dense layout can have hundreds of pairs. */
const MAX_MESSAGES = 50

/**
 * Clearance messages, each naming both items. Clicking one selects the first item it names.
 * Only the summary line is an aria-live region: reading every message on each drag step would be noise.
 */
export function ClearancePanel() {
  const t = useTranslate()
  const locale = useEditorStore((state) => state.locale)
  const items = useEditorStore((state) => state.items)
  const { violations } = useViolations()
  const { select } = useEditorStore.getState()
  const itemsById = useMemo(() => new Map<string, PlacedItem>(items.map((item) => [item.id, item])), [items])

  const shown = violations.slice(0, MAX_MESSAGES)
  const hidden = violations.length - shown.length

  return (
    <>
      <p role="status" className={violations.length > 0 ? 'clearance-summary has-problems' : 'muted'}>
        {violations.length > 0 ? formatViolationCount(locale, violations.length) : t('rule.none')}
      </p>
      {shown.length > 0 && (
        <ul className="clearance-list">
          {shown.map((violation) => {
            const a = itemsById.get(violation.a)
            const b = itemsById.get(violation.b)
            if (!a || !b) return null
            return (
              <li key={`${violation.a}|${violation.b}`}>
                <button type="button" onClick={() => select(violation.a)}>
                  {formatViolation(locale, violation, a, b)}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {hidden > 0 && <p className="muted">{t('rule.more', { count: hidden })}</p>}
    </>
  )
}
