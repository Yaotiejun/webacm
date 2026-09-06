export const POSITION_KEY_QUANT = 1e4

export function posKey(x: number, y: number, z: number, quant = POSITION_KEY_QUANT): string {
  return `${Math.round(x * quant)}_${Math.round(y * quant)}_${Math.round(z * quant)}`
}
