import { useEffect, useRef, type MouseEvent } from 'react'
import type { MessageKey } from '../i18n'
import { useEditorStore } from '../store/editorStore'
import { isMeasuring } from '../urlOptions'
import { useTranslate } from './useTranslate'

/** Remembers that the dialog was shown once, so it only opens by itself on the first visit. */
const SEEN_KEY = 'layout-editor.shortcuts-seen'

interface Row {
  action: MessageKey
  keys?: string[][] // alternatives, each a key combination: [['Ctrl', 'Shift', 'Z'], ['Ctrl', 'Y']]
  mac?: string[][] // shown instead of `keys` on a Mac
}

// Only this platform's keys are listed, so rows stay short. (Ctrl works on a Mac too; ⌘ is what Mac users expect.)
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

// Keep in step with shortcuts.ts (the real key handling) and the README table.
const GROUPS: { title: MessageKey; rows: Row[] }[] = [
  {
    title: 'shortcuts.groupEdit',
    rows: [
      { action: 'shortcuts.undo', keys: [['Ctrl', 'Z']], mac: [['⌘', 'Z']] },
      { action: 'shortcuts.redo', keys: [['Ctrl', 'Shift', 'Z'], ['Ctrl', 'Y']], mac: [['⌘', 'Shift', 'Z']] },
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
  const titleRef = useRef<HTMLHeadingElement>(null)

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
    if (open && !dialog.open) {
      dialog.showModal()
      // Start on the title, not the close button (which would show a focus ring the moment the dialog
      // appears). Screen readers read the title first; Tab then goes to ✕, the list and "Got it".
      titleRef.current?.focus()
    }
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
      aria-describedby="shortcuts-intro"
      onClose={() => setOpen(false)}
      onClick={handleClick}
    >
      <div className="shortcuts-content">
        {/* Title and footer stay put; only the list in between scrolls on short screens. */}
        <header className="shortcuts-header">
          <div>
            <h2 id="shortcuts-title" ref={titleRef} tabIndex={-1}>{t('shortcuts.title')}</h2>
            <p id="shortcuts-intro">{t('shortcuts.intro')}</p>
          </div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={t('shortcuts.close')}>
            <span aria-hidden>✕</span>
          </button>
        </header>

        {/* Focusable so keyboard users can scroll it with the arrow keys. */}
        <div className="shortcuts-body" tabIndex={0} aria-labelledby="shortcuts-title">
          {GROUPS.map((group) => (
            <section key={group.title} className="shortcuts-group" aria-labelledby={`${group.title}-heading`}>
              <h3 id={`${group.title}-heading`}>{t(group.title)}</h3>
              {/* A description list: each action (dt) with its keys (dd). Rows are flex, so a long row
                  doesn't squeeze the others the way shared table columns would. */}
              <dl>
                {group.rows.map((row) => {
                  const keys = (IS_MAC && row.mac) || row.keys
                  return (
                    <div key={row.action} className="shortcut-row">
                      <dt>{t(row.action)}</dt>
                      {keys && (
                        <dd>
                          <Keys alternatives={keys} />
                        </dd>
                      )}
                    </div>
                  )
                })}
              </dl>
            </section>
          ))}
        </div>

        <footer className="shortcuts-footer">
          <button type="button" className="primary" onClick={() => setOpen(false)}>
            {t('shortcuts.done')}
          </button>
        </footer>
      </div>
    </dialog>
  )
}

/** "Ctrl + Shift + Z  /  Ctrl + Y", with each key in a <kbd>. The separators stay in the text for screen readers. */
function Keys({ alternatives }: { alternatives: string[][] }) {
  return alternatives.map((combo, i) => (
    // The "/" ends the previous combination, so when a row wraps the new line starts with a key, not a "/".
    <span key={i} className="key-combo">
      {combo.map((key, j) => (
        <span key={key} className="key-combo">
          {j > 0 && <span className="key-plus"> + </span>}
          <kbd>{key}</kbd>
        </span>
      ))}
      {i < alternatives.length - 1 && <span className="key-or"> / </span>}
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
