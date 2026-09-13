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

/** FDM / Marlin-oriented macros for GridBot (grip grid-bot style). */
export const GRIDBOT_GCODE_MACROS = Object.freeze([
  { id: 'temp', label: 'M105', line: 'M105' },
  { id: 'pos', label: 'M114', line: 'M114' },
  { id: 'home', label: 'G28', line: 'G28' },
  { id: 'endstops', label: 'M119', line: 'M119' },
  { id: 'motors-on', label: 'M17', line: 'M17' },
  { id: 'motors-off', label: 'M84', line: 'M84' },
  { id: 'fan-off', label: 'M107', line: 'M107' },
  { id: 'fan-on', label: 'M106', line: 'M106 S255' },
  { id: 'save', label: 'M500', line: 'M500' },
  { id: 'load', label: 'M501', line: 'M501' },
  { id: 'feed100', label: 'M220 100%', line: 'M220 S100' },
  { id: 'estop', label: 'M112', line: 'M112' },
] as const)

export type GridbotGcodeMacro = (typeof GRIDBOT_GCODE_MACROS)[number]
