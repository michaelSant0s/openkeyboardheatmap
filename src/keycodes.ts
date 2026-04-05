/**
 * Maps libuiohook / Linux EV_KEY scan codes to layout-independent physical keys.
 * We intentionally store KeyboardEvent.code-style identifiers so statistics are
 * stable across QWERTY/QWERTZ/AZERTY and other layouts.
 */
export const SCAN_CODE_TO_KEY_CODE: Record<number, string> = {
  // Top row / system
  0x01: 'Escape',
  0x3b: 'F1',
  0x3c: 'F2',
  0x3d: 'F3',
  0x3e: 'F4',
  0x3f: 'F5',
  0x40: 'F6',
  0x41: 'F7',
  0x42: 'F8',
  0x43: 'F9',
  0x44: 'F10',
  0x57: 'F11',
  0x58: 'F12',
  0x46: 'ScrollLock',
  0x45: 'NumLock',
  0x0e37: 'PrintScreen',
  0x0e45: 'Pause',
  99: 'PrintScreen', // Linux EV_KEY KEY_SYSRQ
  119: 'Pause', // Linux EV_KEY KEY_PAUSE

  // Number row
  0x02: 'Digit1',
  0x03: 'Digit2',
  0x04: 'Digit3',
  0x05: 'Digit4',
  0x06: 'Digit5',
  0x07: 'Digit6',
  0x08: 'Digit7',
  0x09: 'Digit8',
  0x0a: 'Digit9',
  0x0b: 'Digit0',
  0x0c: 'Minus',
  0x0d: 'Equal',
  0x29: 'Backquote',
  0x0e: 'Backspace',

  // Top letter row + navigation key
  0x0f: 'Tab',
  0x10: 'KeyQ',
  0x11: 'KeyW',
  0x12: 'KeyE',
  0x13: 'KeyR',
  0x14: 'KeyT',
  0x15: 'KeyY',
  0x16: 'KeyU',
  0x17: 'KeyI',
  0x18: 'KeyO',
  0x19: 'KeyP',
  0x1a: 'BracketLeft',
  0x1b: 'BracketRight',
  0x2b: 'Backslash',
  0x0e52: 'Insert',
  110: 'Insert', // Linux EV_KEY KEY_INSERT
  0x0e49: 'PageUp',
  104: 'PageUp', // Linux EV_KEY KEY_PAGEUP

  // Home row + navigation
  0x3a: 'CapsLock',
  0x1e: 'KeyA',
  0x1f: 'KeyS',
  0x20: 'KeyD',
  0x21: 'KeyF',
  0x22: 'KeyG',
  0x23: 'KeyH',
  0x24: 'KeyJ',
  0x25: 'KeyK',
  0x26: 'KeyL',
  0x27: 'Semicolon',
  0x28: 'Quote',
  0x1c: 'Enter',
  0x0e53: 'Delete',
  111: 'Delete', // Linux EV_KEY KEY_DELETE
  0x0e51: 'PageDown',
  109: 'PageDown', // Linux EV_KEY KEY_PAGEDOWN

  // Bottom row + navigation
  0x2a: 'ShiftLeft',
  0x0e46: 'IntlBackslash', // legacy/observed uIOhook variant for ISO 102ND key
  0x0e56: 'IntlBackslash', // observed uIOhook variant for VC_LESSER_GREATER
  0x56: 'IntlBackslash', // scan code set 1 for ISO 102ND key
  94: 'IntlBackslash', // Linux/X11 often exposes <LSGT> keycode as 94
  226: 'IntlBackslash', // some stacks expose ISO < > key as 226
  0x2c: 'KeyZ',
  0x2d: 'KeyX',
  0x2e: 'KeyC',
  0x2f: 'KeyV',
  0x30: 'KeyB',
  0x31: 'KeyN',
  0x32: 'KeyM',
  0x33: 'Comma',
  0x34: 'Period',
  0x35: 'Slash',
  0x36: 'ShiftRight',
  0x0e47: 'Home',
  102: 'Home', // Linux EV_KEY KEY_HOME
  0x0e4f: 'End',
  107: 'End', // Linux EV_KEY KEY_END
  0xe048: 'ArrowUp', // uIOhook VC_UP
  0x0e48: 'ArrowUp', // legacy alias (historical typo compatibility)
  103: 'ArrowUp', // Linux EV_KEY KEY_UP

  // Modifier / arrows row
  0x1d: 'ControlLeft',
  0x0e1d: 'ControlRight',
  97: 'ControlRight', // Linux EV_KEY KEY_RIGHTCTRL
  0x38: 'AltLeft',
  0x0e38: 'AltRight',
  100: 'AltRight', // Linux EV_KEY KEY_RIGHTALT
  0x0e5b: 'MetaLeft',
  125: 'MetaLeft', // Linux EV_KEY KEY_LEFTMETA
  0x0e5c: 'MetaRight',
  126: 'MetaRight', // Linux EV_KEY KEY_RIGHTMETA
  0x0e5d: 'ContextMenu',
  127: 'ContextMenu', // Linux EV_KEY KEY_COMPOSE / menu key
  0x39: 'Space',
  0xe04b: 'ArrowLeft', // uIOhook VC_LEFT
  0x0e4b: 'ArrowLeft', // legacy alias (historical typo compatibility)
  105: 'ArrowLeft', // Linux EV_KEY KEY_LEFT
  0xe050: 'ArrowDown', // uIOhook VC_DOWN
  0x0e50: 'ArrowDown', // legacy alias (historical typo compatibility)
  108: 'ArrowDown', // Linux EV_KEY KEY_DOWN
  0xe04d: 'ArrowRight', // uIOhook VC_RIGHT
  0x0e4d: 'ArrowRight', // legacy alias (historical typo compatibility)
  106: 'ArrowRight', // Linux EV_KEY KEY_RIGHT

  // Numpad
  0x0e35: 'NumpadDivide',
  98: 'NumpadDivide', // Linux EV_KEY KEY_KPSLASH
  0x37: 'NumpadMultiply',
  0x4a: 'NumpadSubtract',
  0x4e: 'NumpadAdd',
  0x0e1c: 'NumpadEnter',
  96: 'NumpadEnter', // Linux EV_KEY KEY_KPENTER
  0x53: 'NumpadDecimal',
  0x52: 'Numpad0',
  0x4f: 'Numpad1',
  0x50: 'Numpad2',
  0x51: 'Numpad3',
  0x4b: 'Numpad4',
  0x4c: 'Numpad5',
  0x4d: 'Numpad6',
  0x47: 'Numpad7',
  0x48: 'Numpad8',
  0x49: 'Numpad9',
}

/**
 * Backward compatibility for databases written by older app versions.
 * Old builds stored character-like names (e.g. "q", ";", "space").
 */
const LEGACY_KEY_NAME_TO_CODE: Record<string, string> = {
  '1': 'Digit1',
  '2': 'Digit2',
  '3': 'Digit3',
  '4': 'Digit4',
  '5': 'Digit5',
  '6': 'Digit6',
  '7': 'Digit7',
  '8': 'Digit8',
  '9': 'Digit9',
  '0': 'Digit0',
  '-': 'Minus',
  '=': 'Equal',
  q: 'KeyQ',
  w: 'KeyW',
  e: 'KeyE',
  r: 'KeyR',
  t: 'KeyT',
  y: 'KeyY',
  u: 'KeyU',
  i: 'KeyI',
  o: 'KeyO',
  p: 'KeyP',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  a: 'KeyA',
  s: 'KeyS',
  d: 'KeyD',
  f: 'KeyF',
  g: 'KeyG',
  h: 'KeyH',
  j: 'KeyJ',
  k: 'KeyK',
  l: 'KeyL',
  ';': 'Semicolon',
  "'": 'Quote',
  z: 'KeyZ',
  x: 'KeyX',
  c: 'KeyC',
  v: 'KeyV',
  b: 'KeyB',
  n: 'KeyN',
  m: 'KeyM',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '<': 'IntlBackslash',
  '>': 'IntlBackslash',
  '|': 'IntlBackslash',
  space: 'Space',
  esc: 'Escape',
  escape: 'Escape',
  tab: 'Tab',
  capslock: 'CapsLock',
  enter: 'Enter',
  return: 'Enter',
  backspace: 'Backspace',
  shift: 'ShiftLeft',
  shiftleft: 'ShiftLeft',
  shiftright: 'ShiftRight',
  ctrl: 'ControlLeft',
  control: 'ControlLeft',
  controlleft: 'ControlLeft',
  controlright: 'ControlRight',
  alt: 'AltLeft',
  altleft: 'AltLeft',
  altright: 'AltRight',
  meta: 'MetaLeft',
  win: 'MetaLeft',
  cmd: 'MetaLeft',
  delete: 'Delete',
  del: 'Delete',
  insert: 'Insert',
  ins: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
}

export function normalizeStoredKeyName(keyName: string): string {
  return LEGACY_KEY_NAME_TO_CODE[keyName] || keyName
}
