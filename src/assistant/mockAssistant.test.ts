import { describe, expect, it } from 'vitest'
import type { PlacedItem } from '../domain/types'
import { createMockAssistant, detectIntent, planReply, type AssistantRequest, type ReplyEvent } from './mockAssistant'

function drive(number: number, x: number, z: number): PlacedItem {
  return { id: `drive-${number}`, typeId: 'drive', number, x, z, rotation: 0 }
}

const tooClose = [drive(1, 0.25, 0.25), drive(2, 1.25, 0.25)]
const request = (change: Partial<AssistantRequest>): AssistantRequest => ({
  prompt: '',
  locale: 'en',
  items: tooClose,
  selectedId: null,
  ...change,
})

describe('detectIntent', () => {
  it.each([
    ['Fix all clearance problems', 'fixAll'],
    ['can you fix this?', 'fixOne'],
    ['Drive 2 is too close', 'fixOne'],
    ['How many problems are there?', 'summary'],
    ['Summarise the layout', 'summary'],
    ['Sửa tất cả vấn đề', 'fixAll'],
    ['sua tat ca', 'fixAll'],
    ['Tóm tắt bố trí', 'summary'],
    ['hello', 'help'],
  ])('%s → %s', (prompt, intent) => {
    expect(detectIntent(prompt)).toBe(intent)
  })
})

describe('planReply', () => {
  it('fix one: names the problem and the move, and proposes it', () => {
    const reply = planReply(request({ intent: 'fixOne', selectedId: 'drive-2' }))
    expect(reply.text).toContain('Drive 1 and Drive 2 are 0.5 m apart')
    expect(reply.text).toContain('moving Drive 2 0.5 m, to x 1.75, z 0.25')
    expect(reply.proposal).toMatchObject({ before: 1, after: 0, command: { type: 'move', id: 'drive-2' } })
  })

  it('fix all: proposes the moves as one command', () => {
    const items = [...tooClose, drive(3, 2.25, 0.25)]
    const reply = planReply(request({ intent: 'fixAll', items }))
    expect(reply.text).toContain('2 clearance problems.')
    expect(reply.text).toContain('a single Undo puts them all back')
    expect(reply.proposal).toMatchObject({ before: 2, after: 0, command: { type: 'batch' } })
  })

  it('nothing to fix: says so, proposes nothing', () => {
    const reply = planReply(request({ intent: 'fixOne', items: [drive(1, 0.25, 0.25)] }))
    expect(reply.text).toMatch(/^There are no clearance problems/)
    expect(reply.proposal).toBeUndefined()
  })

  it('summary: counts by type and problems', () => {
    expect(planReply(request({ intent: 'summary' })).text).toBe('The layout has 2 items: Drive × 2. 1 clearance problem.')
  })

  it('answers in Vietnamese with Vietnamese number format', () => {
    const reply = planReply(request({ intent: 'fixOne', locale: 'vi', selectedId: 'drive-2' }))
    expect(reply.text).toContain('Tôi đề xuất di chuyển Biến tần 2 0,5 m, đến x 1,75, z 0,25.')
  })
})

describe('createMockAssistant', () => {
  const assistant = createMockAssistant({ thinkingMs: 0, wordMs: 0 })

  async function collect(signal: AbortSignal, stopAfter = Infinity) {
    const events: ReplyEvent[] = []
    for await (const event of assistant(request({ intent: 'fixOne' }), signal)) {
      events.push(event)
      if (events.length === stopAfter) signal.dispatchEvent(new Event('abort'))
    }
    return events
  }

  it('streams the planned text word by word, then the proposal', async () => {
    const events = await collect(new AbortController().signal)
    const text = events.flatMap((event) => (event.type === 'text' ? [event.text] : [])).join('')
    expect(text).toBe(planReply(request({ intent: 'fixOne' })).text)
    expect(events.filter((event) => event.type === 'text').length).toBeGreaterThan(10)
    expect(events.at(-1)?.type).toBe('proposal')
  })

  it('stops, without a proposal, when aborted', async () => {
    const controller = new AbortController()
    const events: ReplyEvent[] = []
    for await (const event of assistant(request({ intent: 'fixOne' }), controller.signal)) {
      events.push(event)
      if (events.length === 3) controller.abort()
    }
    expect(events).toHaveLength(3)
    expect(events.every((event) => event.type === 'text')).toBe(true)
  })
})
