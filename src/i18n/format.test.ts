import { describe, expect, it } from 'vitest'
import { formatNumber, formatViolation, formatViolationCount, itemLabel, parseNumber } from './format'
import { translate } from './index'

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

describe('translate with placeholders', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'rule.more', { count: 3 })).toBe('and 3 more')
    expect(translate('en', 'rule.more', {})).toBe('and {count} more')
  })
})

describe('violation messages', () => {
  const cabinet = { typeId: 'cabinet', number: 2 } as const
  const drive = { typeId: 'drive', number: 5 } as const

  it('names both items with the gap and the minimum', () => {
    const violation = { a: 'cabinet-2', b: 'drive-5', gap: 0.5, overlap: false }
    expect(formatViolation('en', violation, cabinet, drive)).toBe(
      'Cabinet 2 and Drive 5 are 0.5 m apart; minimum is 0.6 m.',
    )
    expect(formatViolation('vi', violation, cabinet, drive)).toBe(
      'Tủ điện 2 và Biến tần 5 cách nhau 0,5 m; tối thiểu là 0,6 m.',
    )
  })

  it('says "overlap" when the footprints overlap', () => {
    const violation = { a: 'cabinet-2', b: 'drive-5', gap: 0, overlap: true }
    expect(formatViolation('en', violation, cabinet, drive)).toBe('Cabinet 2 and Drive 5 overlap.')
  })

  it('uses the plural form of the language', () => {
    expect(formatViolationCount('en', 1)).toBe('1 clearance problem')
    expect(formatViolationCount('en', 2)).toBe('2 clearance problems')
    expect(formatViolationCount('vi', 1)).toBe('1 vấn đề về khoảng cách')
  })
})
