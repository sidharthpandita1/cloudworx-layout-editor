import { CATALOG } from '../domain/catalog'
import type { PlacedItem } from '../domain/types'
import { MIN_CLEARANCE, type Violation } from '../rules/clearance'
import { translate, type Locale } from './index'

// Creating an Intl.NumberFormat is slow compared with using one, so keep one per language.
const numberFormats = new Map<Locale, Intl.NumberFormat>()

/**
 * Formats a distance in metres for display: up to 2 decimals, with the language's decimal
 * separator ("1.25" in English, "1,25" in Vietnamese). Never shows "-0".
 */
export function formatNumber(locale: Locale, value: number): string {
  let format = numberFormats.get(locale)
  if (!format) {
    format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, signDisplay: 'negative' })
    numberFormats.set(locale, format)
  }
  return format.format(value)
}

/**
 * Reads a number typed by the user. Accepts a dot or a comma as the decimal separator ("3.5" or
 * "3,5") and a typographic minus. Returns null for anything that isn't a plain number.
 * There is no thousands separator: the floor is only 20 m wide.
 */
export function parseNumber(text: string): number | null {
  const normalised = text.trim().replace(',', '.').replace('−', '-')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalised)) return null
  return Number(normalised)
}

/** An item's display name, such as "Cabinet 2" or "Tủ điện 2". Built when shown, never stored. */
export function itemLabel(locale: Locale, item: Pick<PlacedItem, 'typeId' | 'number'>): string {
  return `${translate(locale, CATALOG[item.typeId].nameKey)} ${item.number}`
}

/**
 * "1 clearance problem" / "2 clearance problems". Intl.PluralRules picks the form for the language:
 * English has "one" and "other"; Vietnamese has only "other", so it never changes.
 */
export function formatViolationCount(locale: Locale, count: number): string {
  const form = new Intl.PluralRules(locale).select(count) === 'one' ? 'rule.count.one' : 'rule.count.other'
  return translate(locale, form, { count })
}

type Labelled = Pick<PlacedItem, 'typeId' | 'number'>

/** The message for one violation, naming both items, e.g. "Cabinet 2 and Drive 5 are 0.5 m apart; minimum is 0.6 m." */
export function formatViolation(locale: Locale, violation: Violation, a: Labelled, b: Labelled): string {
  const names = { a: itemLabel(locale, a), b: itemLabel(locale, b) }
  if (violation.overlap) return translate(locale, 'rule.overlap', names)
  return translate(locale, 'rule.tooClose', {
    ...names,
    gap: formatNumber(locale, violation.gap),
    min: formatNumber(locale, MIN_CLEARANCE),
  })
}
