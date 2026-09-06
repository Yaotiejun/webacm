/** Op names from legacy export inline comments (`; starting rough op`). */
export function extractCamOpMarkersFromGcode(gcodeText: string): readonly string[] {
  const ops: string[] = []
  for (const raw of gcodeText.split(/\r?\n/)) {
    const m = raw.trim().match(/;\s*starting\s+(\S+)\s+op/i)
    if (m?.[1]) ops.push(m[1].toLowerCase())
  }
  return ops
}

export const GRIP_CAM_FIXTURE_OP_MARKERS = Object.freeze(['rough'] as const)
