import { en, type MessageKey } from './en'
import { vi } from './vi'

export type { MessageKey }
export type Locale = 'en' | 'vi'

const messages: Record<Locale, Record<MessageKey, string>> = { en, vi }

/** Values for `{name}` placeholders in a message, e.g. `{ a: 'Cabinet 2', gap: '0.5' }`. */
export type MessageParams = Record<string, string | number>

export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const message = messages[locale][key]
  if (!params) return message
  // A placeholder with no value is left as it is, so a mistake is visible instead of silently blank.
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(params[name] ?? placeholder))
}
