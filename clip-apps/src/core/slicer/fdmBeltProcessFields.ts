/**
 * FDM belt process field helpers (CR-30 / bedBelt devices).
 */
import type { FdmProcess } from '@/types/process'

export const FDM_BELT_PROCESS_DEFAULTS = {
  sliceAngle: 45,
  beltAnchor: 0,
  firstLayerBeltLead: 0,
  firstLayerBeltBump: 0,
  firstLayerBeltFact: 1,
} as const

/** Ensure belt knobs exist on a process (does not override set values). */
export function ensureFdmBeltProcessFields(process: FdmProcess): FdmProcess {
  return {
    ...process,
    sliceAngle: process.sliceAngle ?? FDM_BELT_PROCESS_DEFAULTS.sliceAngle,
    beltAnchor: process.beltAnchor ?? FDM_BELT_PROCESS_DEFAULTS.beltAnchor,
    firstLayerBeltLead: process.firstLayerBeltLead ?? FDM_BELT_PROCESS_DEFAULTS.firstLayerBeltLead,
    firstLayerBeltBump: process.firstLayerBeltBump ?? FDM_BELT_PROCESS_DEFAULTS.firstLayerBeltBump,
    firstLayerBeltFact: process.firstLayerBeltFact ?? FDM_BELT_PROCESS_DEFAULTS.firstLayerBeltFact,
  }
}

export function listFdmBeltProcessKeys(): Array<keyof typeof FDM_BELT_PROCESS_DEFAULTS> {
  return Object.keys(FDM_BELT_PROCESS_DEFAULTS) as Array<keyof typeof FDM_BELT_PROCESS_DEFAULTS>
}
