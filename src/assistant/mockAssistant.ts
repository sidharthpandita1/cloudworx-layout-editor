import type { Command } from '../commands/commands'
import { applyCommand } from '../commands/commands'
import { billOfMaterials } from '../domain/bom'
import { CATALOG } from '../domain/catalog'
import type { PlacedItem } from '../domain/types'
import { translate, type Locale, type MessageKey } from '../i18n'
import { formatNumber, formatViolation, formatViolationCount, itemLabel } from '../i18n/format'
import { findViolations, MIN_CLEARANCE } from '../rules/clearance'
import { fixAllViolations, fixViolation, MAX_MOVES, moveLength } from './fix'

/** What the user asked for. The suggestion buttons send one directly; typed text is matched by keywords. */
export type Intent = 'fixOne' | 'fixAll' | 'summary' | 'help'

export interface AssistantRequest {
  prompt: string
  intent?: Intent // known when a suggestion button was used
  locale: Locale
  items: PlacedItem[]
  selectedId: string | null
}

/** A proposed layout change: a normal edit command, plus the clearance problem count before and after. */
export interface Proposal {
  command: Command
  before: number
  after: number
}

/** The pieces of a streamed reply, in order: text pieces, then at most one proposal. */
export type ReplyEvent = { type: 'text'; text: string } | { type: 'proposal'; proposal: Proposal }

/**
 * The contract between the panel and an assistant. This mock runs in the browser; a real one would
 * send the request to a server and turn its streamed response (server-sent events) into the same
 * events. The panel only knows this type, so swapping the mock for a real service changes nothing else.
 */
export type Assistant = (request: AssistantRequest, signal: AbortSignal) => AsyncIterable<ReplyEvent>

/** Picks the intent from typed text, in English or Vietnamese (with or without accents). */
export function detectIntent(prompt: string): Intent {
  const text = prompt.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  const all = /\b(all|every|everything|tat ca|het)\b/.test(text)
  if (/\b(fix|solve|resolve|repair|sua|khac phuc|giai quyet)\b/.test(text)) return all ? 'fixAll' : 'fixOne'
  if (/summar|overview|how many|count|bill|bom|tom tat|tong quan|bao nhieu|danh muc/.test(text)) return 'summary'
  if (/clearance|too close|violation|problem|khoang cach|qua gan|van de/.test(text)) return all ? 'fixAll' : 'fixOne'
  return 'help'
}

/** Decides the whole reply up front: its text, and the change to propose, if any. Pure, so it is easy to test. */
export function planReply(request: AssistantRequest): { text: string; proposal?: Proposal } {
  const { locale, items, selectedId } = request
  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params)
  const num = (value: number) => formatNumber(locale, value)
  const label = (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    return item ? itemLabel(locale, item) : id
  }
  const intent = request.intent ?? detectIntent(request.prompt)
  const violations = findViolations(items)
  const min = num(MIN_CLEARANCE)

  if (intent === 'summary') {
    if (items.length === 0) return { text: t('assistant.reply.empty') }
    const lines = billOfMaterials(items)
      .lines.map((line) => `${t(CATALOG[line.typeId].nameKey)} × ${line.quantity}`)
      .join(', ')
    const problems =
      violations.length === 0 ? t('rule.none') : t('assistant.reply.problems', { problems: formatViolationCount(locale, violations.length) })
    return { text: `${t('assistant.reply.summary', { total: items.length, lines })} ${problems}` }
  }

  if (intent === 'help') return { text: t('assistant.reply.help') }

  if (violations.length === 0) return { text: t('assistant.reply.noProblems', { min }) }

  if (intent === 'fixOne') {
    // The selected item's problem if it has one, otherwise the first in the list.
    const violation = violations.find((v) => v.a === selectedId || v.b === selectedId) ?? violations[0]
    const a = items.find((item) => item.id === violation.a)
    const b = items.find((item) => item.id === violation.b)
    if (!a || !b) return { text: t('assistant.reply.help') }
    const problem = formatViolation(locale, violation, a, b)
    const move = fixViolation(items, violation, selectedId)
    if (!move) return { text: `${problem} ${t('assistant.reply.noSpot', { a: label(a.id), b: label(b.id), min })}` }
    const advice = t('assistant.reply.moveOne', {
      item: label(move.id),
      distance: num(moveLength(move)),
      x: num(move.to.x),
      z: num(move.to.z),
      min,
    })
    return { text: `${problem} ${advice} ${t('assistant.reply.previewOne')}`, proposal: proposalFor(items, move, violations.length) }
  }

  // fixAll
  const moves = fixAllViolations(items)
  const count = formatViolationCount(locale, violations.length)
  if (moves.length === 0) return { text: `${t('assistant.reply.problems', { problems: count })} ${t('assistant.reply.noSpotAll', { min })}` }
  const command: Command = moves.length === 1 ? moves[0] : { type: 'batch', commands: moves }
  const proposal = proposalFor(items, command, violations.length)
  const plural = new Intl.PluralRules(locale).select(moves.length) === 'one' ? 'assistant.reply.moveMany.one' : 'assistant.reply.moveMany.other'
  const parts = [
    t('assistant.reply.problems', { problems: count }),
    t(plural, { moves: moves.length, before: proposal.before, after: proposal.after }),
  ]
  if (proposal.after > 0) parts.push(moves.length >= MAX_MOVES ? t('assistant.reply.capped', { max: MAX_MOVES }) : t('assistant.reply.someLeft'))
  parts.push(t('assistant.reply.oneUndo'), t('assistant.reply.previewMany'))
  return { text: parts.join(' '), proposal }
}

/** Timing of the mock stream. Tests set both to 0. */
export interface MockTiming {
  thinkingMs: number // pause before the first word, like a model starting up
  wordMs: number // between words
}

const DEFAULT_TIMING: MockTiming = { thinkingMs: 500, wordMs: 35 }

/** The mock assistant: plans the reply at once, then streams it word by word, then sends the proposal. */
export function createMockAssistant(timing: MockTiming = DEFAULT_TIMING): Assistant {
  return async function* mockAssistant(request, signal) {
    const reply = planReply(request)
    await wait(timing.thinkingMs, signal)
    // Words with their following spaces, so joining the pieces gives back the exact text.
    for (const word of reply.text.match(/\S+\s*/g) ?? []) {
      if (signal.aborted) return
      yield { type: 'text', text: word }
      await wait(timing.wordMs, signal)
    }
    if (reply.proposal && !signal.aborted) yield { type: 'proposal', proposal: reply.proposal }
  }
}

function proposalFor(items: PlacedItem[], command: Command, before: number): Proposal {
  return { command, before, after: findViolations(applyCommand(items, command)).length }
}

/** Resolves after `ms`, or straight away when the request is stopped. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) return resolve()
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
    function done() {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}
