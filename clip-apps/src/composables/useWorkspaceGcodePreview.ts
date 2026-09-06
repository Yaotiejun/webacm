import { ref, type Ref } from 'vue'
import {
  useGcodeThreeViewport,
  type GcodeThreeToolPosition,
  type UseGcodeThreeViewportOptions,
} from '@/composables/useGcodeThreeViewport'
import { MAKERA_CARVERA_MACHINE_ENVELOPE } from '@/core/devices/carveraMachineEnvelope'
import { CARVERA_OBJ_PUBLIC_URL } from '@/core/devices/carveraMachineModel'

export type WorkspaceGcodePreviewKind = 'carvera' | 'gridbot' | 'cam' | 'fdm' | 'raster'

type ViewportPreset = Pick<
  UseGcodeThreeViewportOptions,
  | 'pathColor'
  | 'rapidPathColor'
  | 'tipColor'
  | 'cameraPosition'
  | 'gridSize'
  | 'gridDivisions'
  | 'axesSize'
  | 'minOrbitDistance'
  | 'maxOrbitDistance'
>

export function workspaceGcodeColorToCss(color: number): string {
  return `#${(color >>> 0).toString(16).padStart(6, '0')}`
}

export const WORKSPACE_GCODE_VIEWPORT_PRESETS: Record<WorkspaceGcodePreviewKind, ViewportPreset> = {
  carvera: {
    pathColor: 0x409eff,
    rapidPathColor: 0x79bbff,
    tipColor: 0xc45656,
    cameraPosition: [180, 140, 180],
    gridSize: 400,
    gridDivisions: 40,
    axesSize: 60,
    minOrbitDistance: 40,
    maxOrbitDistance: 1200,
  },
  gridbot: {
    pathColor: 0x67c23a,
    rapidPathColor: 0x95d475,
    tipColor: 0x409eff,
    cameraPosition: [160, 120, 160],
    gridSize: 300,
    gridDivisions: 30,
    axesSize: 50,
    minOrbitDistance: 35,
    maxOrbitDistance: 900,
  },
  cam: {
    pathColor: 0xd48806,
    rapidPathColor: 0xa8abb2,
    tipColor: 0xf56c6c,
    cameraPosition: [180, 140, 180],
    gridSize: 400,
    gridDivisions: 40,
    axesSize: 60,
    minOrbitDistance: 40,
    maxOrbitDistance: 1200,
  },
  fdm: {
    pathColor: 0x9b59b6,
    rapidPathColor: 0xc39bd3,
    tipColor: 0x67c23a,
    cameraPosition: [140, 100, 140],
    gridSize: 300,
    gridDivisions: 30,
    axesSize: 50,
    minOrbitDistance: 35,
    maxOrbitDistance: 900,
  },
  raster: {
    pathColor: 0x13c2c2,
    rapidPathColor: 0x5cdbd3,
    tipColor: 0xfa8c16,
    cameraPosition: [160, 120, 160],
    gridSize: 400,
    gridDivisions: 40,
    axesSize: 60,
    minOrbitDistance: 40,
    maxOrbitDistance: 1200,
  },
}

export interface UseWorkspaceGcodePreviewOptions {
  jobGcode: Ref<string>
  toolPosition: Ref<GcodeThreeToolPosition>
  stemColor: Ref<number>
  /** Override preset fields (e.g. CAM stem follows spindle state). */
  presetOverrides?: Partial<ViewportPreset>
}

/**
 * One-call G-code polyline viewport for product workspaces (refs + colors preset).
 */
export function useWorkspaceGcodePreview(
  kind: WorkspaceGcodePreviewKind,
  opts: UseWorkspaceGcodePreviewOptions,
) {
  const viewportRootRef = ref<HTMLElement | null>(null)
  const viewportCanvasRef = ref<HTMLCanvasElement | null>(null)
  const preset = { ...WORKSPACE_GCODE_VIEWPORT_PRESETS[kind], ...opts.presetOverrides }

  const { jobPathHint } = useGcodeThreeViewport({
    rootRef: viewportRootRef,
    canvasRef: viewportCanvasRef,
    jobGcode: opts.jobGcode,
    toolPosition: opts.toolPosition,
    stemColor: opts.stemColor,
    ...preset,
    machineEnvelope: kind === 'carvera' ? MAKERA_CARVERA_MACHINE_ENVELOPE : undefined,
    machineModelUrl: kind === 'carvera' ? CARVERA_OBJ_PUBLIC_URL : undefined,
  })

  return { jobPathHint, viewportRootRef, viewportCanvasRef }
}
