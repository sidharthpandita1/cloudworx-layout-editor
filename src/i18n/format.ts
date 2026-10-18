import { CATALOG } from '../domain/catalog'
import type { PlacedItem } from '../domain/types'
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
