import { beforeEach, describe, expect, it } from 'vitest'
import type { PlacedItem } from '../domain/types'
import { useEditorStore } from '../store/editorStore'
import { useAssistantStore } from './assistantStore'
import { createMockAssistant } from './mockAssistant'

const editor = useEditorStore
const assistant = useAssistantStore

function drive(number: number, x: number, z: number): PlacedItem {
  return { id: `drive-${number}`, typeId: 'drive', number, x, z, rotation: 0 }
}

beforeEach(() => {
  editor.setState(editor.getInitialState(), true)
  assistant.setState({ ...assistant.getInitialState(), assistant: createMockAssistant({ thinkingMs: 0, wordMs: 0 }) }, true)
  editor.getState().loadLayout([drive(1, 0.25, 0.25), drive(2, 1.25, 0.25), drive(3, 2.25, 0.25)])
})

const lastProposal = () => assistant.getState().messages.at(-1)?.proposal
const positions = () => editor.getState().items.map((item) => [item.x, item.z])

describe('assistant store', () => {
  it('adds the question and the streamed reply with a pending proposal', async () => {
    await assistant.getState().ask('Fix all', 'fixAll')
    const [question, reply] = assistant.getState().messages
    expect(question).toMatchObject({ role: 'user', text: 'Fix all' })
    expect(reply).toMatchObject({ role: 'assistant', streaming: false })
    expect(reply.text.length).toBeGreaterThan(0)
    expect(lastProposal()?.status).toBe('pending')
    expect(assistant.getState().streaming).toBe(false)
  })

  it('accept applies every move as one undo step', async () => {
    const before = positions()
    await assistant.getState().ask('Fix all', 'fixAll')
    assistant.getState().accept(assistant.getState().messages[1].id)

    expect(lastProposal()?.status).toBe('accepted')
    expect(positions()).not.toEqual(before)
    expect(editor.getState().past).toHaveLength(1)
    editor.getState().undo()
    expect(positions()).toEqual(before)
  })

  it('reject changes nothing', async () => {
    const before = positions()
    await assistant.getState().ask('Fix one', 'fixOne')
    assistant.getState().reject(assistant.getState().messages[1].id)
    expect(lastProposal()?.status).toBe('rejected')
    expect(positions()).toEqual(before)
  })

  it('refuses an out-of-date proposal after the layout changed', async () => {
    await assistant.getState().ask('Fix one', 'fixOne')
    editor.getState().moveItem('drive-3', { x: 5, z: 5 })
    const before = positions()
    assistant.getState().accept(assistant.getState().messages[1].id)
    expect(positions()).toEqual(before)
    expect(lastProposal()?.status).toBe('pending') // still shown, marked out of date by the panel
  })

  it('a new question replaces a proposal that is still waiting', async () => {
    await assistant.getState().ask('Fix one', 'fixOne')
    await assistant.getState().ask('Fix one', 'fixOne')
    const statuses = assistant.getState().messages.map((message) => message.proposal?.status)
    expect(statuses).toEqual([undefined, 'replaced', undefined, 'pending'])
  })
})
