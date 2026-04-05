import { describe, it, expect } from 'vitest'
import { KEYBOARD_ROWS, getHeatmapColor } from '../src/keyboard-layout'

describe('keyboard layout', () => {
  it('should have at least 6 rows', () => {
    expect(KEYBOARD_ROWS.length).toBeGreaterThanOrEqual(6)
  })

  it('should include required special keys', () => {
    const allKeys = new Set(KEYBOARD_ROWS.flat().map((k) => k.keyCode))
    for (const keyCode of [
      'Escape',
      'Tab',
      'CapsLock',
      'Enter',
      'Backspace',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'MetaLeft',
      'MetaRight',
      'ContextMenu',
      'Delete',
      'Insert',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'NumLock',
      'NumpadDivide',
      'NumpadMultiply',
      'NumpadSubtract',
      'NumpadAdd',
      'NumpadEnter',
      'NumpadDecimal',
      'Numpad0',
      'Numpad1',
      'Numpad2',
      'Numpad3',
      'Numpad4',
      'Numpad5',
      'Numpad6',
      'Numpad7',
      'Numpad8',
      'Numpad9',
    ]) {
      expect(allKeys.has(keyCode)).toBe(true)
    }
  })

  it('should have unique key codes', () => {
    const allKeys = KEYBOARD_ROWS.flat().map((k) => k.keyCode)
    expect(new Set(allKeys).size).toBe(allKeys.length)
  })

  it('should include every alphabet key code', () => {
    const allKeys = KEYBOARD_ROWS.flat().map((k) => k.keyCode)
    for (const code of [
      'KeyA',
      'KeyB',
      'KeyC',
      'KeyD',
      'KeyE',
      'KeyF',
      'KeyG',
      'KeyH',
      'KeyI',
      'KeyJ',
      'KeyK',
      'KeyL',
      'KeyM',
      'KeyN',
      'KeyO',
      'KeyP',
      'KeyQ',
      'KeyR',
      'KeyS',
      'KeyT',
      'KeyU',
      'KeyV',
      'KeyW',
      'KeyX',
      'KeyY',
      'KeyZ',
    ]) {
      expect(allKeys).toContain(code)
    }
  })
})

describe('getHeatmapColor', () => {
  it('should return white for zero count', () => {
    expect(getHeatmapColor(0, 100)).toBe('rgb(255, 255, 255)')
  })

  it('should return white when maxCount is zero', () => {
    expect(getHeatmapColor(0, 0)).toBe('#ffffff')
  })

  it('should return green for max count', () => {
    expect(getHeatmapColor(100, 100)).toBe('rgb(76, 175, 80)')
  })

  it('should return an intermediate colour for half count', () => {
    const color = getHeatmapColor(50, 100)
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    const [r] = color.match(/\d+/g)!.map(Number)
    expect(r).toBeGreaterThan(76)
    expect(r).toBeLessThan(255)
  })

  it('should clamp ratio at 1 when count exceeds max', () => {
    expect(getHeatmapColor(200, 100)).toBe('rgb(76, 175, 80)')
  })
})
