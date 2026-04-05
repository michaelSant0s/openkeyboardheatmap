export interface KeyDef {
  fallbackLabel: string
  keyCode: string
  width?: number
}

export interface KeyboardRenderRow {
  main: KeyDef[]
  nav: KeyDef[]
  numpad: KeyDef[]
}

export const KEYBOARD_RENDER_ROWS: KeyboardRenderRow[] = [
  {
    main: [
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
    ],
    nav: [
      { fallbackLabel: 'PrtSc', keyCode: 'PrintScreen' },
      { fallbackLabel: 'ScrLk', keyCode: 'ScrollLock' },
      { fallbackLabel: 'Pause', keyCode: 'Pause' },
    ],
    numpad: [
      { fallbackLabel: 'Num', keyCode: 'NumLock' },
      { fallbackLabel: '/', keyCode: 'NumpadDivide' },
      { fallbackLabel: '*', keyCode: 'NumpadMultiply' },
      { fallbackLabel: '-', keyCode: 'NumpadSubtract' },
    ],
  },
  {
    main: [
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
      { fallbackLabel: 'Backspace', keyCode: 'Backspace', width: 2 },
    ],
    nav: [
      { fallbackLabel: 'Ins', keyCode: 'Insert' },
      { fallbackLabel: 'Home', keyCode: 'Home' },
      { fallbackLabel: 'PgUp', keyCode: 'PageUp' },
    ],
    numpad: [
      { fallbackLabel: '7', keyCode: 'Numpad7' },
      { fallbackLabel: '8', keyCode: 'Numpad8' },
      { fallbackLabel: '9', keyCode: 'Numpad9' },
      { fallbackLabel: '+', keyCode: 'NumpadAdd' },
    ],
  },
  {
    main: [
      { fallbackLabel: 'Tab', keyCode: 'Tab', width: 1.5 },
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
      { fallbackLabel: '\\', keyCode: 'Backslash', width: 1.5 },
    ],
    nav: [
      { fallbackLabel: 'Del', keyCode: 'Delete' },
      { fallbackLabel: 'End', keyCode: 'End' },
      { fallbackLabel: 'PgDn', keyCode: 'PageDown' },
    ],
    numpad: [
      { fallbackLabel: '4', keyCode: 'Numpad4' },
      { fallbackLabel: '5', keyCode: 'Numpad5' },
      { fallbackLabel: '6', keyCode: 'Numpad6' },
    ],
  },
  {
    main: [
      { fallbackLabel: 'Caps', keyCode: 'CapsLock', width: 1.75 },
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
      { fallbackLabel: 'Enter', keyCode: 'Enter', width: 2.25 },
    ],
    nav: [],
    numpad: [
      { fallbackLabel: '1', keyCode: 'Numpad1' },
      { fallbackLabel: '2', keyCode: 'Numpad2' },
      { fallbackLabel: '3', keyCode: 'Numpad3' },
      { fallbackLabel: 'Enter', keyCode: 'NumpadEnter' },
    ],
  },
  {
    main: [
      { fallbackLabel: 'Shift', keyCode: 'ShiftLeft', width: 1.25 },
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
    ],
    nav: [
      { fallbackLabel: '↑', keyCode: 'ArrowUp' },
    ],
    numpad: [
      { fallbackLabel: '0', keyCode: 'Numpad0', width: 2 },
      { fallbackLabel: ',', keyCode: 'NumpadDecimal' },
    ],
  },
  {
    main: [
      { fallbackLabel: 'Ctrl', keyCode: 'ControlLeft', width: 1.25 },
      { fallbackLabel: 'Meta', keyCode: 'MetaLeft', width: 1.25 },
      { fallbackLabel: 'Alt', keyCode: 'AltLeft', width: 1.25 },
      { fallbackLabel: 'Space', keyCode: 'Space', width: 6.25 },
      { fallbackLabel: 'AltGr', keyCode: 'AltRight', width: 1.25 },
      { fallbackLabel: 'Meta', keyCode: 'MetaRight', width: 1.25 },
      { fallbackLabel: 'Menu', keyCode: 'ContextMenu', width: 1.25 },
      { fallbackLabel: 'Ctrl', keyCode: 'ControlRight', width: 1.25 },
    ],
    nav: [
      { fallbackLabel: '←', keyCode: 'ArrowLeft' },
      { fallbackLabel: '↓', keyCode: 'ArrowDown' },
      { fallbackLabel: '→', keyCode: 'ArrowRight' },
    ],
    numpad: [],
  },
]

export const KEYBOARD_ROWS: KeyDef[][] = KEYBOARD_RENDER_ROWS.map(
  (row) => [...row.main, ...row.nav, ...row.numpad]
)

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
