import { useEffect } from 'react'
import { translate } from '../i18n'
import { itemLabel } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'

/** How long a notice stays on screen. Each new notice (even the same text) restarts the time. */
const NOTICE_MS = 3000

/**
 * A short warning over the 3D view when an edit is refused, e.g. "Can't put it here: Cabinet 1 is in
 * the way." The region is always in the page with role="alert", so screen readers announce new text.
 */
export function NoticeToast() {
  const notice = useEditorStore((state) => state.notice)
  const locale = useEditorStore((state) => state.locale)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => useEditorStore.getState().dismissNotice(), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  return (
    <div className="toast-region" role="alert">
      {notice && (
        // key: a repeated notice is a new element, so the pop-up animation plays again.
        <p key={notice.id} className="toast">
          {translate(locale, notice.message, { item: itemLabel(locale, notice.blocker) })}
        </p>
      )}
    </div>
  )
}
