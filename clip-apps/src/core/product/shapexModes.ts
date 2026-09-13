/**
 * Product mode scope (revised): desktop Laser cutting, CNC (CAM), FDM + SLA.
 * WJET / WEDM / DRAG remain out of scope unless later requested.
 */
export type ShapexPrimaryMode = 'FDM' | 'CAM' | 'LASER' | 'SLA'

export const SHAPEX_PRIMARY_MODES: readonly ShapexPrimaryMode[] = [
  'FDM',
  'CAM',
  'LASER',
  'SLA',
] as const

export const SHAPEX_DEFERRED_MODES = ['DRAG', 'WJET', 'WEDM'] as const

export function isPrimaryShapexMode(mode: string): mode is ShapexPrimaryMode {
  return (SHAPEX_PRIMARY_MODES as readonly string[]).includes(mode)
}

/** Kiri mode folder under grid-apps `src/kiri/mode/`. */
export function kiriModeDirFor(mode: ShapexPrimaryMode): string {
  switch (mode) {
    case 'FDM':
      return 'fdm'
    case 'CAM':
      return 'cam'
    case 'LASER':
      return 'laser'
    case 'SLA':
      return 'sla'
  }
}
