export function toCenteredGray(grey01: number, symmetricDisplacement: boolean): number {
  if (!symmetricDisplacement) return grey01
  return grey01 - 0.5
}
