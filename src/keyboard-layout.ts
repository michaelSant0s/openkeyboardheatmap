export interface KeyDef {
  fallbackLabel: string
  keyCode: string
  width?: number
}

export const KEYBOARD_ROWS: KeyDef[][] = [
  // Function row
  [
    { fallbackLabel: 'Esc', keyCode: 'Escape', width: 1.25 },
    { fallbackLabel: 'F1', keyCode: 'F1' },
    { fallbackLabel: 'F2', keyCode: 'F2' },
    { fallbackLabel: 'F3', keyCode: 'F3' },
    { fallbackLabel: 'F4', keyCode: 'F4' },
    { fallbackLabel: 'F5', keyCode: 'F5' },
    { fallbackLabel: 'F6', keyCode: 'F6' },
    { fallbackLabel: 'F7', keyCode: 'F7' },
    { fallbackLabel: 'F8', keyCode: 'F8' },
    { fallbackLabel: 'F9', keyCode: 'F9' },
    { fallbackLabel: 'F10', keyCode: 'F10' },
    { fallbackLabel: 'F11', keyCode: 'F11' },
    { fallbackLabel: 'F12', keyCode: 'F12' },
    { fallbackLabel: 'PrtSc', keyCode: 'PrintScreen', width: 1.25 },
    { fallbackLabel: 'ScrLk', keyCode: 'ScrollLock', width: 1.25 },
    { fallbackLabel: 'Pause', keyCode: 'Pause', width: 1.25 },
  ],
  // Number row
  [
    { fallbackLabel: '`', keyCode: 'Backquote' },
    { fallbackLabel: '1', keyCode: 'Digit1' },
    { fallbackLabel: '2', keyCode: 'Digit2' },
    { fallbackLabel: '3', keyCode: 'Digit3' },
    { fallbackLabel: '4', keyCode: 'Digit4' },
    { fallbackLabel: '5', keyCode: 'Digit5' },
    { fallbackLabel: '6', keyCode: 'Digit6' },
    { fallbackLabel: '7', keyCode: 'Digit7' },
    { fallbackLabel: '8', keyCode: 'Digit8' },
    { fallbackLabel: '9', keyCode: 'Digit9' },
    { fallbackLabel: '0', keyCode: 'Digit0' },
    { fallbackLabel: '-', keyCode: 'Minus' },
    { fallbackLabel: '=', keyCode: 'Equal' },
    { fallbackLabel: 'Backspace', keyCode: 'Backspace', width: 2.25 },
  ],
  // Top letter row
  [
    { fallbackLabel: 'Tab', keyCode: 'Tab', width: 1.6 },
    { fallbackLabel: 'Q', keyCode: 'KeyQ' },
    { fallbackLabel: 'W', keyCode: 'KeyW' },
    { fallbackLabel: 'E', keyCode: 'KeyE' },
    { fallbackLabel: 'R', keyCode: 'KeyR' },
    { fallbackLabel: 'T', keyCode: 'KeyT' },
    { fallbackLabel: 'Y', keyCode: 'KeyY' },
    { fallbackLabel: 'U', keyCode: 'KeyU' },
    { fallbackLabel: 'I', keyCode: 'KeyI' },
    { fallbackLabel: 'O', keyCode: 'KeyO' },
    { fallbackLabel: 'P', keyCode: 'KeyP' },
    { fallbackLabel: '[', keyCode: 'BracketLeft' },
    { fallbackLabel: ']', keyCode: 'BracketRight' },
    { fallbackLabel: '\\', keyCode: 'Backslash', width: 1.7 },
    { fallbackLabel: 'Del', keyCode: 'Delete', width: 1.2 },
    { fallbackLabel: 'Home', keyCode: 'Home', width: 1.2 },
    { fallbackLabel: 'PgUp', keyCode: 'PageUp', width: 1.2 },
  ],
  // Home row
  [
    { fallbackLabel: 'Caps', keyCode: 'CapsLock', width: 1.95 },
    { fallbackLabel: 'A', keyCode: 'KeyA' },
    { fallbackLabel: 'S', keyCode: 'KeyS' },
    { fallbackLabel: 'D', keyCode: 'KeyD' },
    { fallbackLabel: 'F', keyCode: 'KeyF' },
    { fallbackLabel: 'G', keyCode: 'KeyG' },
    { fallbackLabel: 'H', keyCode: 'KeyH' },
    { fallbackLabel: 'J', keyCode: 'KeyJ' },
    { fallbackLabel: 'K', keyCode: 'KeyK' },
    { fallbackLabel: 'L', keyCode: 'KeyL' },
    { fallbackLabel: ';', keyCode: 'Semicolon' },
    { fallbackLabel: "'", keyCode: 'Quote' },
    { fallbackLabel: 'Enter', keyCode: 'Enter', width: 2.35 },
    { fallbackLabel: 'Ins', keyCode: 'Insert', width: 1.2 },
    { fallbackLabel: 'End', keyCode: 'End', width: 1.2 },
    { fallbackLabel: 'PgDn', keyCode: 'PageDown', width: 1.2 },
  ],
  // Bottom row + up arrow
  [
    { fallbackLabel: 'Shift', keyCode: 'ShiftLeft', width: 2.35 },
    { fallbackLabel: '\\', keyCode: 'IntlBackslash' },
    { fallbackLabel: 'Z', keyCode: 'KeyZ' },
    { fallbackLabel: 'X', keyCode: 'KeyX' },
    { fallbackLabel: 'C', keyCode: 'KeyC' },
    { fallbackLabel: 'V', keyCode: 'KeyV' },
    { fallbackLabel: 'B', keyCode: 'KeyB' },
    { fallbackLabel: 'N', keyCode: 'KeyN' },
    { fallbackLabel: 'M', keyCode: 'KeyM' },
    { fallbackLabel: ',', keyCode: 'Comma' },
    { fallbackLabel: '.', keyCode: 'Period' },
    { fallbackLabel: '/', keyCode: 'Slash' },
    { fallbackLabel: 'Shift', keyCode: 'ShiftRight', width: 2.75 },
    { fallbackLabel: '↑', keyCode: 'ArrowUp', width: 1.2 },
  ],
  // Modifier row + arrows
  [
    { fallbackLabel: 'Ctrl', keyCode: 'ControlLeft', width: 1.35 },
    { fallbackLabel: 'Meta', keyCode: 'MetaLeft', width: 1.35 },
    { fallbackLabel: 'Alt', keyCode: 'AltLeft', width: 1.35 },
    { fallbackLabel: 'Space', keyCode: 'Space', width: 5.6 },
    { fallbackLabel: 'AltGr', keyCode: 'AltRight', width: 1.35 },
    { fallbackLabel: 'Meta', keyCode: 'MetaRight', width: 1.35 },
    { fallbackLabel: 'Menu', keyCode: 'ContextMenu', width: 1.35 },
    { fallbackLabel: 'Ctrl', keyCode: 'ControlRight', width: 1.35 },
    { fallbackLabel: '←', keyCode: 'ArrowLeft', width: 1.2 },
    { fallbackLabel: '↓', keyCode: 'ArrowDown', width: 1.2 },
    { fallbackLabel: '→', keyCode: 'ArrowRight', width: 1.2 },
  ],
]

/**
 * Interpolate from white (#fff) → green (rgb 76,175,80) based on
 * keystroke count relative to the maximum.
 */
export function getHeatmapColor(count: number, maxCount: number): string {
  if (maxCount === 0) return '#ffffff'
  const ratio = Math.min(count / maxCount, 1)
  const r = Math.round(255 - ratio * (255 - 76))
  const g = Math.round(255 - ratio * (255 - 175))
  const b = Math.round(255 - ratio * (255 - 80))
  return `rgb(${r}, ${g}, ${b})`
}
