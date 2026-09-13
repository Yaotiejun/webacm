/**
 * Carvera / GRBL-family debug & quick-control macros (carve-control parity).
 * Printer-centric macros (M105/M112/M114) stay on GridBot via DEVICE_GCODE_MACROS.
 */

export const CARVERA_GCODE_MACROS = Object.freeze([
  { id: 'status', label: '?', line: '?' },
  { id: 'home', label: '$H', line: '$H' },
  { id: 'unlock', label: '$X', line: '$X' },
  { id: 'abs', label: 'G90', line: 'G90' },
  { id: 'rel', label: 'G91', line: 'G91' },
  { id: 'hold', label: '!', line: '!' },
  { id: 'cycle', label: '~', line: '~' },
  { id: 'clear', label: 'Clear', line: 'M496.1' },
  { id: 'origin', label: 'Origin', line: 'M496.2' },
  { id: 'anchor1', label: 'Anchor1', line: 'M496.3' },
  { id: 'anchor2', label: 'Anchor2', line: 'M496.4' },
  { id: 'vac-on', label: 'Vac ON', line: 'M331' },
  { id: 'vac-off', label: 'Vac OFF', line: 'M332' },
  { id: 'laser-on', label: 'Laser ON', line: 'M321' },
  { id: 'laser-off', label: 'Laser OFF', line: 'M322' },
] as const)

export type CarveraGcodeMacro = (typeof CARVERA_GCODE_MACROS)[number]

/** WCS zero helpers (carve-control x/y/z/a-zero). */
export const CARVERA_WCS_ZERO_MACROS = Object.freeze([
  { id: 'x-zero', label: 'X0', line: 'G10L20P0X0' },
  { id: 'y-zero', label: 'Y0', line: 'G10L20P0Y0' },
  { id: 'z-zero', label: 'Z0', line: 'G10L20P0Z0' },
  { id: 'a-zero', label: 'A0', line: 'G92.4A0' },
] as const)
