import type { ReactNode } from 'react'
import type { MessageKey } from '../i18n'
import type { Side } from './usePanelOpen'
import { useTranslate } from './useTranslate'

const LABELS: Record<Side, { name: MessageKey; hide: MessageKey; show: MessageKey }> = {
  left: { name: 'panel.left', hide: 'panel.hideLeft', show: 'panel.showLeft' },
  right: { name: 'panel.right', hide: 'panel.hideRight', show: 'panel.showRight' },
}

/**
 * A side column with a button that hides and shows its contents. Closed, it shrinks to a thin strip
 * holding only that button, and the 3D view takes the space. The contents are `hidden` while closed,
 * so they can't be tabbed to or read out.
 */
export function SidePanel({ side, open, onToggle, children }: { side: Side; open: boolean; onToggle: () => void; children: ReactNode }) {
  const t = useTranslate()
  const labels = LABELS[side]
  const contentId = `${side}-panel-content`
  // The chevron points the way the panel will move: towards its edge to hide, away from it to show.
  const pointsLeft = (side === 'left') === open
  return (
    <aside className={open ? `panel panel-${side}` : `panel panel-${side} collapsed`} aria-label={t(labels.name)}>
      <button
        type="button"
        className="icon-button panel-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={t(open ? labels.hide : labels.show)}
        title={t(open ? labels.hide : labels.show)}
        onClick={onToggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path
            d={pointsLeft ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </aside>
  )
}
