import { describe, expect, it } from 'vitest'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from './camGcodeFingerprint'
import {
  CAM_SESSION_BUNDLE_SCHEMA_VERSION,
  createCamSessionBundleExportArtifact,
  normalizeTargetRunProfileForSessionExport,
} from './sessionBundleExport'
import { TRACE_SCHEMA_VERSION } from '@/core/traceKeys'
import { TRACE_FIXTURE_SOURCE_FINGERPRINT, TRACE_FIXTURE_SOURCE_LABEL } from '@/core/traceFixtures'

describe('cam.sessionBundleExport', () => {
  it('creates deterministic bundle artifact with migration meta', async () => {
    const out = await createCamSessionBundleExportArtifact(
      {
        targetRun: {
          id: 'r1',
          name: 'run',
          createdAt: 1,
          geometry: { id: 'g' },
          result: { backend: 'cam-placeholder', profileName: null, deviceName: 'd', processName: 'p', stockSize: null, zSettings: { anchor: null, bottom: null, clearance: null }, summary: { opCount: 0, toolCountUsed: 0, estimatedTotalPasses: 0, estimatedTotalPathSegments: 0, estimatedMachiningTimeMinutes: 0 }, perOp: [], notes: [] },
          profile: {},
        },
        selectedProfileName: 'p1',
        currentDevice: { deviceName: 'd' },
        currentProcessName: 'proc',
        currentOpsCount: 2,
        hasCurrentResult: false,
        currentBackend: null,
        diffTargetRunName: 'run',
        diffItems: [],
        diffLogs: [],
        traceSourceLabel: TRACE_FIXTURE_SOURCE_LABEL,
        traceSourceFingerprint: TRACE_FIXTURE_SOURCE_FINGERPRINT,
      },
      new Date('2026-01-02T03:04:05.678Z'),
    )
    expect(out.filename).toBe('cam-session-bundle-2026-01-02T03-04-05-678Z.json')
    const parsed = JSON.parse(out.json) as {
      trace: { traceSchemaVersion: number; sourceLabel: string; sourceFingerprint: string }
      migrationMeta: { schemaVersion: number }
    }
    expect(parsed.trace.traceSchemaVersion).toBe(TRACE_SCHEMA_VERSION)
    expect(parsed.trace.sourceLabel).toBe(TRACE_FIXTURE_SOURCE_LABEL)
    expect(parsed.trace.sourceFingerprint).toBe(TRACE_FIXTURE_SOURCE_FINGERPRINT)
    expect(parsed.migrationMeta.schemaVersion).toBe(CAM_SESSION_BUNDLE_SCHEMA_VERSION)
  })

  it('keeps inline gcodeText when under bundle size cap', async () => {
    const gcode = 'G21\nG90\nG1 X1\n'
    const out = await createCamSessionBundleExportArtifact({
      targetRun: {
        id: 'r-inline',
        name: 'inline',
        createdAt: 1,
        geometry: {},
        result: {
          backend: 'kiri-cam',
          profileName: null,
          deviceName: 'd',
          processName: 'p',
          stockSize: null,
          zSettings: { anchor: null, bottom: null, clearance: null },
          summary: {
            opCount: 0,
            toolCountUsed: 0,
            estimatedTotalPasses: 0,
            estimatedTotalPathSegments: 0,
            estimatedMachiningTimeMinutes: 0,
          },
          perOp: [],
          notes: [],
          fallback: null,
          gcodeText: gcode,
        },
        profile: {},
      },
      selectedProfileName: null,
      currentDevice: {},
      currentProcessName: null,
      currentOpsCount: 0,
      hasCurrentResult: false,
      currentBackend: null,
      diffTargetRunName: null,
      diffItems: [],
      diffLogs: [],
    })
    const parsed = JSON.parse(out.json) as { targetRun: { result: { gcodeText?: string; gcodeSummary?: unknown } } }
    expect(parsed.targetRun.result.gcodeText).toBe(gcode)
    expect(parsed.targetRun.result.gcodeSummary).toBeUndefined()
  })

  it('embeds targetGcodeSha256 when target run has gcodeText', async () => {
    const gcode = 'G21\nG90\n'
    const out = await createCamSessionBundleExportArtifact(
      {
        targetRun: {
          id: 'r2',
          name: 'run2',
          createdAt: 2,
          geometry: {},
          result: {
            backend: 'kiri-cam',
            profileName: null,
            deviceName: 'd',
            processName: 'p',
            stockSize: null,
            zSettings: { anchor: null, bottom: null, clearance: null },
            summary: {
              opCount: 1,
              toolCountUsed: 1,
              estimatedTotalPasses: 1,
              estimatedTotalPathSegments: 1,
              estimatedMachiningTimeMinutes: 0.1,
            },
            perOp: [],
            notes: [],
            fallback: null,
            gcodeText: gcode,
          },
          profile: {},
        },
        selectedProfileName: null,
        currentDevice: {},
        currentProcessName: null,
        currentOpsCount: 0,
        hasCurrentResult: false,
        currentBackend: null,
        diffTargetRunName: null,
        diffItems: [],
        diffLogs: [],
        traceSourceLabel: null,
        traceSourceFingerprint: null,
      },
      new Date('2026-01-02T03:04:05.678Z'),
    )
    const parsed = JSON.parse(out.json) as {
      migrationMeta: { engineHints: { targetGcodeSha256: string | null; targetGcodeByteLength: number } }
    }
    expect(parsed.migrationMeta.engineHints.targetGcodeByteLength).toBe(gcode.length)
    expect(parsed.migrationMeta.engineHints.targetGcodeSha256).toBe(
      await sha256HexUtf8(normalizeCamGcodeForMigrationFingerprint(gcode)),
    )
  })

  it('embeds legacy debug hints when target run carries legacyDebug', async () => {
    const out = await createCamSessionBundleExportArtifact(
      {
        targetRun: {
          id: 'r3',
          name: 'run3',
          createdAt: 3,
          geometry: {},
          result: {
            backend: 'cam-placeholder',
            profileName: null,
            deviceName: 'd',
            processName: 'p',
            stockSize: null,
            zSettings: { anchor: null, bottom: null, clearance: null },
            summary: {
              opCount: 0,
              toolCountUsed: 0,
              estimatedTotalPasses: 0,
              estimatedTotalPathSegments: 0,
              estimatedMachiningTimeMinutes: 0,
            },
            perOp: [],
            notes: [],
            fallback: null,
            legacyDebug: {
              ready: false,
              hasSlice: true,
              hasExport: false,
              initErrorMessage: null,
              legacyImportErrorMessage: 'failed to fetch dynamically imported module',
            },
          },
          profile: {},
        },
        selectedProfileName: null,
        currentDevice: {},
        currentProcessName: null,
        currentOpsCount: 0,
        hasCurrentResult: false,
        currentBackend: null,
        diffTargetRunName: null,
        diffItems: [],
        diffLogs: [],
        traceSourceLabel: null,
        traceSourceFingerprint: null,
      },
      new Date('2026-01-02T03:04:05.678Z'),
    )
    const parsed = JSON.parse(out.json) as {
      migrationMeta: {
        engineHints: {
          targetLegacyReady: boolean | null
          targetLegacyHasSlice: boolean | null
          targetLegacyHasExport: boolean | null
          targetLegacyImportError: string | null
        }
      }
    }
    expect(parsed.migrationMeta.engineHints.targetLegacyReady).toBe(false)
    expect(parsed.migrationMeta.engineHints.targetLegacyHasSlice).toBe(true)
    expect(parsed.migrationMeta.engineHints.targetLegacyHasExport).toBe(false)
    expect(parsed.migrationMeta.engineHints.targetLegacyImportError).toContain('failed to fetch')
  })

  it('normalizeTargetRunProfileForSessionExport drops legacy keys when canonical exists', () => {
    const out = normalizeTargetRunProfileForSessionExport({
      device: { deviceName: 'd' },
      tools: [],
      process: { processName: 'p', camDrillDown: 2, drillDown: 2, ops: [] },
    }) as { process: Record<string, unknown> }
    expect(out.process.camDrillDown).toBe(2)
    expect(out.process.drillDown).toBeUndefined()
  })

  it('normalizeTargetRunProfileForSessionExport maps legacy-only drillDown to camDrillDown and drops drillDown', () => {
    const out = normalizeTargetRunProfileForSessionExport({
      device: { deviceName: 'd' },
      tools: [],
      process: { processName: 'p', drillDown: 2.5, ops: [] },
    }) as { process: Record<string, unknown> }
    expect(out.process.camDrillDown).toBe(2.5)
    expect(out.process.drillDown).toBeUndefined()
  })

  it('session bundle JSON uses canonical-only targetRun.profile.process', async () => {
    const out = await createCamSessionBundleExportArtifact(
      {
        targetRun: {
          id: 'r4',
          name: 'run4',
          createdAt: 4,
          geometry: {},
          result: {
            backend: 'cam-placeholder',
            profileName: null,
            deviceName: 'd',
            processName: 'p',
            stockSize: null,
            zSettings: { anchor: null, bottom: null, clearance: null },
            summary: {
              opCount: 0,
              toolCountUsed: 0,
              estimatedTotalPasses: 0,
              estimatedTotalPathSegments: 0,
              estimatedMachiningTimeMinutes: 0,
            },
            perOp: [],
            notes: [],
            fallback: null,
          },
          profile: {
            device: { deviceName: 'd' },
            tools: [],
            process: { processName: 'p', camDrillDown: 1, drillDown: 1, ops: [] },
          },
        },
        selectedProfileName: null,
        currentDevice: {},
        currentProcessName: null,
        currentOpsCount: 0,
        hasCurrentResult: false,
        currentBackend: null,
        diffTargetRunName: null,
        diffItems: [],
        diffLogs: [],
        traceSourceLabel: null,
        traceSourceFingerprint: null,
      },
      new Date('2026-01-02T03:04:05.678Z'),
    )
    const parsed = JSON.parse(out.json) as { targetRun: { profile: { process: Record<string, unknown> } } }
    expect(parsed.targetRun.profile.process.camDrillDown).toBe(1)
    expect(parsed.targetRun.profile.process.drillDown).toBeUndefined()
  })
})
