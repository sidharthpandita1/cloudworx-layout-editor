import { describe, expect, it } from 'vitest'
import { formatNumber, itemLabel, parseNumber } from './format'

describe('formatNumber', () => {
  it('uses the language decimal separator', () => {
    expect(formatNumber('en', 1.25)).toBe('1.25')
    expect(formatNumber('vi', 1.25)).toBe('1,25')
  })

  it('drops trailing zeros and never shows -0', () => {
    expect(formatNumber('en', 3)).toBe('3')
    expect(formatNumber('en', -0)).toBe('0')
    expect(formatNumber('en', -0.25)).toBe('-0.25')
  })
})

describe('parseNumber', () => {
  it('accepts a dot or a comma as the decimal separator', () => {
    expect(parseNumber('3.5')).toBe(3.5)
    expect(parseNumber('3,5')).toBe(3.5)
    expect(parseNumber(' -1,25 ')).toBe(-1.25)
    expect(parseNumber('−2')).toBe(-2)
    expect(parseNumber('.5')).toBe(0.5)
  })

  it('rejects text that is not a plain number', () => {
    for (const text of ['', ' ', 'abc', '1.2.3', '1e3', '3 m', '-']) {
      expect(parseNumber(text)).toBeNull()
    }
  })
})

describe('itemLabel', () => {
  it('combines the translated type name with the number', () => {
    expect(itemLabel('en', { typeId: 'cabinet', number: 2 })).toBe('Cabinet 2')
    expect(itemLabel('vi', { typeId: 'cabinet', number: 2 })).toBe('Tủ điện 2')
  })
})
