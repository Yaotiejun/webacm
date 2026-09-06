import type { FdmProcess } from '@/types/process'
import type { SliceJobPayload } from '@/types/job'
import {
  buildLegacyFdmControllerProfile,
  buildLegacyFdmDeviceProfile,
} from '@/core/slicer/kiriLegacyFdmDefaults'

export function toKiriLegacyRanges(process: FdmProcess): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(process.ranges)) return undefined
  return process.ranges.map((r) => ({
    lo: Number(r.fromLayer) || 0,
    hi: Number(r.toLayer) || 0,
    fields: {
      sliceHeight: r.sliceHeight,
      outputTemp: r.outputTemp,
      outputFeedrate: r.outputFeedrate,
      outputFanSpeed: r.outputFanSpeed,
      outputRetractDist: r.outputRetractDist,
    },
  }))
}

export function toKiriLegacyProcess(process: FdmProcess): Record<string, unknown> {
  return {
    ...process,
    ranges: toKiriLegacyRanges(process),
    sliceAdaptive: process.sliceAdaptive,
    sliceMinHeight: process.sliceMinHeight,
    sliceSupportGap: process.sliceSupportZGap,
    sliceSupportGrow: process.sliceSupportXYExpand,
    sliceSupportOutline: process.sliceSupportOutlineOnly,
    sliceDetectThin: process.sliceDetectThin,
    sliceCompInner: process.sliceCompInner,
    sliceCompOuter: process.sliceCompOuter,
    outputShellMult: process.outputShellMult,
    outputFillMult: process.outputFillMult,
    outputSparseMult: process.outputSparseMult,
    firstLayerBrim: process.enableBrim ? process.brimCount : 0,
    outputBrimOffset: process.brimOffset,
    outputRaft: process.enableRaft,
    outputRaftSpacing: process.raftSpacing,
  }
}

export function buildKiriSettingsPayload(input: {
  process: FdmProcess
  modelCount: number
  deviceProfile: unknown
  controllerProfile: unknown
}): Record<string, unknown> {
  return {
    mode: 'FDM',
    render: false,
    process: toKiriLegacyProcess(input.process),
    device: buildLegacyFdmDeviceProfile(
      input.process,
      input.deviceProfile as Record<string, unknown> | null | undefined,
    ),
    controller: buildLegacyFdmControllerProfile(
      input.controllerProfile as Record<string, unknown> | null | undefined,
    ),
    bounds: undefined,
    widget: {
      _single: {
        id: '_single',
      },
    },
    jobMeta: {
      modelCount: input.modelCount,
    },
  }
}
