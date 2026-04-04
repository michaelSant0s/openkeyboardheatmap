import { describe, expect, it } from 'vitest'
import { SCAN_CODE_TO_KEY_CODE, normalizeStoredKeyName } from '../src/keycodes'

describe('scan code mapping', () => {
  it('maps important special keys from uiohook/evdev values', () => {
    expect(SCAN_CODE_TO_KEY_CODE[0x01]).toBe('Escape')
    expect(SCAN_CODE_TO_KEY_CODE[0x0e]).toBe('Backspace')
    expect(SCAN_CODE_TO_KEY_CODE[0x0f]).toBe('Tab')
    expect(SCAN_CODE_TO_KEY_CODE[0x1c]).toBe('Enter')
    expect(SCAN_CODE_TO_KEY_CODE[0x2a]).toBe('ShiftLeft')
    expect(SCAN_CODE_TO_KEY_CODE[0x0e46]).toBe('IntlBackslash')
    expect(SCAN_CODE_TO_KEY_CODE[94]).toBe('IntlBackslash')
    expect(SCAN_CODE_TO_KEY_CODE[226]).toBe('IntlBackslash')
    expect(SCAN_CODE_TO_KEY_CODE[0x36]).toBe('ShiftRight')
    expect(SCAN_CODE_TO_KEY_CODE[0x1d]).toBe('ControlLeft')
    expect(SCAN_CODE_TO_KEY_CODE[97]).toBe('ControlRight')
    expect(SCAN_CODE_TO_KEY_CODE[0x38]).toBe('AltLeft')
    expect(SCAN_CODE_TO_KEY_CODE[100]).toBe('AltRight')
    expect(SCAN_CODE_TO_KEY_CODE[125]).toBe('MetaLeft')
    expect(SCAN_CODE_TO_KEY_CODE[126]).toBe('MetaRight')
    expect(SCAN_CODE_TO_KEY_CODE[0xe048]).toBe('ArrowUp')
    expect(SCAN_CODE_TO_KEY_CODE[0xe04b]).toBe('ArrowLeft')
    expect(SCAN_CODE_TO_KEY_CODE[0xe04d]).toBe('ArrowRight')
    expect(SCAN_CODE_TO_KEY_CODE[0xe050]).toBe('ArrowDown')
    expect(SCAN_CODE_TO_KEY_CODE[103]).toBe('ArrowUp')
    expect(SCAN_CODE_TO_KEY_CODE[105]).toBe('ArrowLeft')
    expect(SCAN_CODE_TO_KEY_CODE[106]).toBe('ArrowRight')
    expect(SCAN_CODE_TO_KEY_CODE[108]).toBe('ArrowDown')
  })
})

describe('legacy key normalization', () => {
  it('normalizes old key labels for special keys', () => {
    expect(normalizeStoredKeyName('esc')).toBe('Escape')
    expect(normalizeStoredKeyName('enter')).toBe('Enter')
    expect(normalizeStoredKeyName('shift')).toBe('ShiftLeft')
    expect(normalizeStoredKeyName('controlright')).toBe('ControlRight')
    expect(normalizeStoredKeyName('arrowup')).toBe('ArrowUp')
    expect(normalizeStoredKeyName('<')).toBe('IntlBackslash')
  })
})
