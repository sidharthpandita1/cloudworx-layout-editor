import { en, type MessageKey } from './en'
import { vi } from './vi'

export type { MessageKey }
export type Locale = 'en' | 'vi'

const messages: Record<Locale, Record<MessageKey, string>> = { en, vi }

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key]
}
