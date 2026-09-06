/** Common machine commands (Carvera / GridBot debug & quick control). */
export const DEVICE_GCODE_MACROS = Object.freeze([
  { id: 'status', label: '?', line: '?' },
  { id: 'home', label: 'G28', line: 'G28' },
  { id: 'abs', label: 'G90', line: 'G90' },
  { id: 'rel', label: 'G91', line: 'G91' },
  { id: 'pos', label: 'M114', line: 'M114' },
  { id: 'temp', label: 'M105', line: 'M105' },
  { id: 'estop', label: 'M112', line: 'M112' },
  { id: 'unlock', label: '$X', line: '$X' },
] as const)

export type DeviceGcodeMacro = (typeof DEVICE_GCODE_MACROS)[number]
