import { create } from 'zustand'
import type { PlacedItem } from '../domain/types'
import { useEditorStore } from '../store/editorStore'
import { createMockAssistant, type Assistant, type Intent, type Proposal } from './mockAssistant'

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'replaced'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean // still arriving
  stopped?: boolean // the user pressed Stop
  failed?: boolean // the stream broke off with an error
  proposal?: Proposal & {
    status: ProposalStatus
    // The layout the proposal was planned on. If `items` is no longer this exact array, the layout has
    // changed since, and the proposal is out of date (see isStale).
    basedOn: PlacedItem[]
  }
}

interface AssistantState {
  open: boolean
  messages: ChatMessage[]
  streaming: boolean
  assistant: Assistant // the mock; tests swap in one without delays
}

interface AssistantActions {
  setOpen: (open: boolean) => void
  /** Sends a question and streams the reply into the conversation. */
  ask: (prompt: string, intent?: Intent) => Promise<void>
  stop: () => void
  /** Applies the proposal as one edit (one undo step). Does nothing if it is out of date. */
  accept: (messageId: number) => void
  reject: (messageId: number) => void
}

let nextId = 1
let controller: AbortController | null = null

/**
 * The assistant conversation. Kept apart from the editor store: the assistant only reads the layout and,
 * when the user accepts, hands the editor a normal command through `execute`, like any other edit.
 */
export const useAssistantStore = create<AssistantState & AssistantActions>()((set, get) => ({
  open: false,
  messages: [],
  streaming: false,
  assistant: createMockAssistant(),

  setOpen: (open) => set({ open }),

  ask: async (prompt, intent) => {
    get().stop()
    const { items, selectedId, locale } = useEditorStore.getState()
    const question: ChatMessage = { id: nextId++, role: 'user', text: prompt }
    const replyId = nextId++
    set((state) => ({
      // Only one proposal is open at a time: a new question replaces the one still waiting.
      messages: [...state.messages.map((message) => withStatus(message, 'pending', 'replaced')), question, { id: replyId, role: 'assistant', text: '', streaming: true }],
      streaming: true,
    }))

    const current = new AbortController()
    controller = current
    const update = (change: (message: ChatMessage) => ChatMessage) =>
      set((state) => ({ messages: state.messages.map((message) => (message.id === replyId ? change(message) : message)) }))

    let failed = false
    try {
      for await (const event of get().assistant({ prompt, intent, locale, items, selectedId }, current.signal)) {
        if (event.type === 'text') update((message) => ({ ...message, text: message.text + event.text }))
        else update((message) => ({ ...message, proposal: { ...event.proposal, status: 'pending', basedOn: items } }))
      }
    } catch {
      failed = true // a real service can fail mid-stream; the panel then says so
    }
    update((message) => ({ ...message, streaming: false, stopped: current.signal.aborted, failed }))
    if (controller === current) {
      controller = null
      set({ streaming: false })
    }
  },

  stop: () => {
    controller?.abort()
    controller = null
    set({ streaming: false })
  },

  accept: (messageId) => {
    const proposal = get().messages.find((message) => message.id === messageId)?.proposal
    if (!proposal || proposal.status !== 'pending' || isStale(proposal, useEditorStore.getState().items)) return
    useEditorStore.getState().execute(proposal.command)
    set((state) => ({ messages: state.messages.map((message) => (message.id === messageId ? withStatus(message, 'pending', 'accepted') : message)) }))
  },

  reject: (messageId) =>
    set((state) => ({ messages: state.messages.map((message) => (message.id === messageId ? withStatus(message, 'pending', 'rejected') : message)) })),
}))

/** True when the layout changed after the proposal was planned, so applying it could be wrong. */
export function isStale(proposal: NonNullable<ChatMessage['proposal']>, items: PlacedItem[]): boolean {
  return proposal.basedOn !== items
}

/** The proposal shown as a ghost in the 3D view: the one still waiting, if it is up to date. */
export function useActiveProposal(): Proposal | null {
  const proposal = useAssistantStore((state) => state.messages.findLast((message) => message.proposal?.status === 'pending')?.proposal)
  const items = useEditorStore((state) => state.items)
  return proposal && !isStale(proposal, items) ? proposal : null
}

function withStatus(message: ChatMessage, from: ProposalStatus, to: ProposalStatus): ChatMessage {
  return message.proposal?.status === from ? { ...message, proposal: { ...message.proposal, status: to } } : message
}
