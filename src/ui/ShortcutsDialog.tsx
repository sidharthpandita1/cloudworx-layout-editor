import { useEffect, useRef, type MouseEvent } from 'react'
import type { MessageKey } from '../i18n'
import { useEditorStore } from '../store/editorStore'
import { isMeasuring } from '../urlOptions'
import { useTranslate } from './useTranslate'

/** Remembers that the dialog was shown once, so it only opens by itself on the first visit. */
const SEEN_KEY = 'layout-editor.shortcuts-seen'

interface Row {
  action: MessageKey
  keys?: string[][] // alternatives, each a key combination: [['Ctrl', 'Z'], ['⌘', 'Z']]
}

// Keep in step with shortcuts.ts (the real key handling) and the README table.
const GROUPS: { title: MessageKey; rows: Row[] }[] = [
  {
    title: 'shortcuts.groupEdit',
    rows: [
      { action: 'shortcuts.undo', keys: [['Ctrl', 'Z'], ['⌘', 'Z']] },
      { action: 'shortcuts.redo', keys: [['Ctrl', 'Shift', 'Z'], ['Ctrl', 'Y'], ['⌘', '⇧', 'Z']] },
      { action: 'shortcuts.rotate', keys: [['R']] },
      { action: 'shortcuts.delete', keys: [['Delete'], ['Backspace']] },
      { action: 'shortcuts.escape', keys: [['Esc']] },
    ],
  },
  {
    title: 'shortcuts.groupMove',
    rows: [
      { action: 'shortcuts.move', keys: [['←'], ['→'], ['↑'], ['↓']] },
      { action: 'shortcuts.moveFar', keys: [['Shift', '←/→/↑/↓']] },
    ],
  },
  {
    title: 'shortcuts.groupSelect',
    rows: [
      { action: 'shortcuts.listNext', keys: [['↑'], ['↓']] },
      { action: 'shortcuts.listEnds', keys: [['Home'], ['End']] },
      { action: 'shortcuts.tab', keys: [['Tab'], ['Shift', 'Tab']] },
      { action: 'shortcuts.help', keys: [['?']] },
    ],
  },
  {
    title: 'shortcuts.groupMouse',
    rows: [
      { action: 'shortcuts.place' },
      { action: 'shortcuts.drag' },
      { action: 'shortcuts.orbit' },
      { action: 'shortcuts.zoom' },
      { action: 'shortcuts.pan' },
    ],
  },
]

/** Header button that opens the shortcuts dialog. */
export function ShortcutsButton() {
  const t = useTranslate()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      title={`${t('shortcuts.title')} (?)`}
      aria-keyshortcuts="Shift+?"
      onClick={() => useEditorStore.getState().setShortcutsOpen(true)}
    >
      <span aria-hidden>⌨ </span>
      {t('shortcuts.button')}
    </button>
  )
}

/**
 * The keyboard shortcuts list, in a native <dialog>: the browser keeps focus inside while it is open,
 * closes it on Esc and returns focus afterwards. Opens by itself on the first visit only.
 */
export function ShortcutsDialog() {
  const t = useTranslate()
  const open = useEditorStore((state) => state.shortcutsOpen)
  const setOpen = useEditorStore((state) => state.setShortcutsOpen)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // First visit: open once, then remember. Not while measuring, so it can't block a test or FPS run.
  useEffect(() => {
    if (isMeasuring || readSeen()) return
    setOpen(true)
    writeSeen()
  }, [setOpen])

  // Keep the native dialog in step with the store.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // A click on the dimmed backdrop lands on the <dialog> element itself; clicks inside land on its content.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) setOpen(false)
  }

  return (
    // onClose fires for Esc, the buttons and the backdrop alike.
    <dialog
      ref={dialogRef}
      className="shortcuts-dialog"
      aria-labelledby="shortcuts-title"
      onClose={() => setOpen(false)}
      onClick={handleClick}
    >
      <div className="shortcuts-content">
        <header>
          <h2 id="shortcuts-title">{t('shortcuts.title')}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label={t('shortcuts.close')}>
            ✕
          </button>
        </header>
        <p className="muted">{t('shortcuts.intro')}</p>

        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3>{t(group.title)}</h3>
            <table>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.action}>
                    <th scope="row">{t(row.action)}</th>
                    <td>{row.keys && <Keys alternatives={row.keys} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <footer>
          <button type="button" className="primary" onClick={() => setOpen(false)}>
            {t('shortcuts.done')}
          </button>
        </footer>
      </div>
    </dialog>
  )
}

/** "Ctrl + Z  /  ⌘ + Z", with each key in a <kbd>. */
function Keys({ alternatives }: { alternatives: string[][] }) {
  return alternatives.map((combo, i) => (
    <span key={i} className="key-combo">
      {i > 0 && <span className="muted"> / </span>}
      {combo.map((key, j) => (
        <span key={key}>
          {j > 0 && ' + '}
          <kbd>{key}</kbd>
        </span>
      ))}
    </span>
  ))
}

// Storage can be blocked (private windows, strict settings): then the dialog simply opens each visit.
function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // ignore: see readSeen
  }
}
