import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { isStale, useActiveProposal, useAssistantStore, type ChatMessage } from '../assistant/assistantStore'
import { movesIn } from '../assistant/fix'
import type { Intent } from '../assistant/mockAssistant'
import type { MessageKey } from '../i18n'
import { formatNumber, itemLabel } from '../i18n/format'
import { useEditorStore } from '../store/editorStore'
import { useTranslate } from './useTranslate'

const SUGGESTIONS: { intent: Intent; label: MessageKey }[] = [
  { intent: 'fixOne', label: 'assistant.chip.fixOne' },
  { intent: 'fixAll', label: 'assistant.chip.fixAll' },
  { intent: 'summary', label: 'assistant.chip.summary' },
]

/**
 * The assistant as a chat bubble in the bottom-right corner of the 3D view. Clicking it opens the chat
 * above it; the 3D view keeps its full width. The chat stays mounted while closed (hidden, so not
 * focusable or read out), so the conversation and a waiting proposal survive closing it.
 */
export function AssistantLauncher() {
  const t = useTranslate()
  const open = useAssistantStore((state) => state.open)
  const waiting = useActiveProposal() !== null
  const setOpen = useAssistantStore((state) => state.setOpen)
  const bubbleRef = useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    bubbleRef.current?.focus() // focus goes back to the bubble
  }

  return (
    <div className="assistant-dock">
      <AssistantChat open={open} onClose={close} />
      <button
        ref={bubbleRef}
        type="button"
        className="assistant-bubble"
        aria-expanded={open}
        aria-controls="assistant-chat"
        aria-label={open ? t('assistant.close') : t('assistant.open')}
        title={open ? t('assistant.close') : t('assistant.open')}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span aria-hidden>{open ? '✕' : '✨'}</span>
        {/* A proposal is waiting while the chat is closed: a dot on the bubble, and words for screen readers. */}
        {waiting && !open && (
          <span className="bubble-dot">
            <span className="visually-hidden">{t('assistant.waiting')}</span>
          </span>
        )}
      </button>
    </div>
  )
}

/** The chat window. Not modal: the 3D view stays usable, so the ghost preview can be orbited around. */
function AssistantChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslate()
  const { messages, streaming, ask, stop } = useAssistantStore()
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Opening the chat puts the cursor in the question box.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the newest words in view while a reply streams in.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.stopPropagation() // Esc closes the chat only; it doesn't also clear the selection
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const prompt = draft.trim()
    if (!prompt || streaming) return
    setDraft('')
    void ask(prompt)
  }

  return (
    <section
      id="assistant-chat"
      className={open ? 'assistant-chat open' : 'assistant-chat'}
      role="dialog"
      aria-labelledby="assistant-title"
      inert={!open}
      onKeyDown={handleKeyDown}
    >
      <header className="assistant-header">
        <h2 id="assistant-title">
          {t('assistant.title')} <span className="badge">{t('assistant.demo')}</span>
        </h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t('assistant.close')}>
          <span aria-hidden>✕</span>
        </button>
      </header>

      <div ref={logRef} className="assistant-log" role="log" aria-busy={streaming} aria-labelledby="assistant-title" tabIndex={0}>
        <p className="bubble from-assistant">{t('assistant.intro')}</p>
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>

      <div className="assistant-compose">
        <div className="chips" role="group" aria-label={t('assistant.suggestions')}>
          {SUGGESTIONS.map(({ intent, label }) => (
            <button key={intent} type="button" className="chip" disabled={streaming} onClick={() => void ask(t(label), intent)}>
              {t(label)}
            </button>
          ))}
        </div>
        <form className="assistant-form" onSubmit={handleSubmit}>
          <label htmlFor="assistant-input" className="visually-hidden">
            {t('assistant.inputLabel')}
          </label>
          <input
            ref={inputRef}
            id="assistant-input"
            type="text"
            autoComplete="off"
            value={draft}
            placeholder={t('assistant.placeholder')}
            onChange={(event) => setDraft(event.target.value)}
          />
          {streaming ? (
            <button type="button" onClick={stop}>
              {t('assistant.stop')}
            </button>
          ) : (
            <button type="submit" className="primary" disabled={!draft.trim()}>
              {t('assistant.send')}
            </button>
          )}
        </form>
      </div>
    </section>
  )
}

function Message({ message }: { message: ChatMessage }) {
  const t = useTranslate()
  if (message.role === 'user') {
    return (
      <p className="bubble from-user">
        <span className="visually-hidden">{t('assistant.you')}: </span>
        {message.text}
      </p>
    )
  }
  return (
    <div className="bubble from-assistant">
      {message.text ? <p>{message.text}</p> : message.streaming && <p className="thinking">{t('assistant.thinking')}</p>}
      {message.stopped && <p className="muted">{t('assistant.stopped')}</p>}
      {message.failed && <p className="muted">{t('assistant.failed')}</p>}
      {message.proposal && <ProposalCard messageId={message.id} proposal={message.proposal} />}
    </div>
  )
}

function ProposalCard({ messageId, proposal }: { messageId: number; proposal: NonNullable<ChatMessage['proposal']> }) {
  const t = useTranslate()
  const locale = useEditorStore((state) => state.locale)
  const items = useEditorStore((state) => state.items)
  const { accept, reject } = useAssistantStore.getState()
  const stale = proposal.status === 'pending' && isStale(proposal, items)
  const num = (value: number) => formatNumber(locale, value)

  return (
    <section className="proposal" aria-label={t('assistant.proposal.title')}>
      <h3>{t('assistant.proposal.title')}</h3>
      <ul>
        {movesIn(proposal.command).map((move) => {
          const item = proposal.basedOn.find((candidate) => candidate.id === move.id)
          return (
            <li key={move.id}>
              <span className="proposal-item">{item ? itemLabel(locale, item) : move.id}</span>
              <span className="proposal-coords">
                {t('assistant.proposal.move', { fromX: num(move.from.x), fromZ: num(move.from.z), toX: num(move.to.x), toZ: num(move.to.z) })}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="proposal-problems">{t('assistant.proposal.problems', { before: proposal.before, after: proposal.after })}</p>
      {proposal.status === 'pending' && !stale && (
        <div className="proposal-actions">
          <button type="button" className="primary" onClick={() => accept(messageId)}>
            {t('assistant.accept')}
          </button>
          <button type="button" onClick={() => reject(messageId)}>
            {t('assistant.reject')}
          </button>
        </div>
      )}
      {stale && <p className="proposal-status">{t('assistant.status.stale')}</p>}
      {proposal.status !== 'pending' && <p className="proposal-status">{t(`assistant.status.${proposal.status}`)}</p>}
    </section>
  )
}
