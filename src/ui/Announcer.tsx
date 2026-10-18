import { describeCommand, describeSelection } from '../i18n/announce'
import { translate } from '../i18n'
import { itemLabel } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'

/**
 * Hidden live region: screen readers read out every edit, undo, redo and selection change, whatever
 * caused it (mouse, keyboard or list). Built in the current language when shown.
 */
export function Announcer() {
  const announcement = useEditorStore((state) => state.announcement)
  const items = useEditorStore((state) => state.items)
  const locale = useEditorStore((state) => state.locale)

  let text = ''
  if (announcement?.kind === 'edit') {
    const action = describeCommand(locale, announcement.command, items)
    text = announcement.via === 'edit' ? action : translate(locale, `announce.${announcement.via}`, { action })
  } else if (announcement?.kind === 'selected' || announcement?.kind === 'wall') {
    const item = items.find((candidate) => candidate.id === announcement.itemId)
    if (item) {
      text =
        announcement.kind === 'selected'
          ? describeSelection(locale, item)
          : translate(locale, 'announce.wall', { item: itemLabel(locale, item) })
    }
  } else if (announcement?.kind === 'deselected') {
    text = translate(locale, 'announce.deselected')
  }

  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {/* key: a new element each time, so the same sentence twice is read out twice. */}
      {announcement && <p key={announcement.id}>{text}</p>}
    </div>
  )
}
