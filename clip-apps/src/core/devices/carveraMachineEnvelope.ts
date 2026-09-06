/**
 * Work envelope from grip `Makera.Carvera.json` (bed + Z travel).
 * Used for Carvera 3D preview wireframe (not full OBJ mesh).
 */
export const MAKERA_CARVERA_MACHINE_ENVELOPE = Object.freeze({
  widthMm: 360,
  depthMm: 240,
  maxHeightMm: 150,
  bedHeightMm: 2.5,
  deviceName: 'Makera Carvera',
} as const)

export type MachineEnvelopeMm = {
  widthMm: number
  depthMm: number
  maxHeightMm: number
}

export function formatMachineEnvelopeHint(env: MachineEnvelopeMm): string {
  return `${env.widthMm}×${env.depthMm}×${env.maxHeightMm} mm`
}
