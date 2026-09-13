/**
 * Desktop laser engine — TypeScript port of Kiri LASER prepare/export.
 */
import { parseDxfToLaserPolylines } from '@/core/laser/laserDxfParse'
import { buildLaserGcodeFromPrepared } from '@/core/laser/laserGcode'
import {
  prepareLaserPolylines,
  preparedToPolylines,
} from '@/core/laser/laserKiriPrepare'
import { exportLaserPolylinesToSvg } from '@/core/laser/laserSvgExport'
import { parseSvgToLaserPolylines, type LaserPolyline } from '@/core/laser/laserSvgParse'
import { getStockLaserDevice } from '@/core/laser/stock/stockLaserDevices'
import type {
  LaserBackendKind,
  LaserEngineProcess,
  LaserEngineResult,
} from '@/core/laser/laserEngineTypes'

export type { LaserBackendKind, LaserEngineProcess, LaserEngineResult }

/** Plain clone so Worker postMessage / Pinia never sees Vue proxies. */
export function cloneLaserPolylines(polys: LaserPolyline[]): LaserPolyline[] {
  return polys.map((p) => ({
    closed: Boolean(p.closed),
    points: (p.points || []).map((q) => ({ x: Number(q.x), y: Number(q.y) })),
  }))
}

function buildResult(
  polylinesIn: LaserPolyline[],
  opts: { deviceId?: string; process?: LaserEngineProcess; backend?: LaserBackendKind },
): LaserEngineResult {
  const deviceId = opts.deviceId || 'Any.Generic.Laser'
  const stock = getStockLaserDevice(deviceId)
  const process = opts.process || {}
  const engrave = Boolean(process.engraveScan)
  const prepared = prepareLaserPolylines(cloneLaserPolylines(polylinesIn), {
    kerf: engrave ? 0 : process.kerf,
    nestGap: engrave ? 0 : process.nestGap,
    bedWidth: stock?.bedWidth,
    bedDepth: stock?.bedDepth,
    origin: process.origin ?? (engrave ? 'preserve' : 'center'),
    engraveScan: engrave,
    grouped: process.grouped,
    layoutPack: engrave ? false : process.layoutPack,
  })
  const polylines = preparedToPolylines(prepared)
  const gcodeText = buildLaserGcodeFromPrepared(
    prepared,
    {
      feedrate: process.feedrate,
      seekrate: process.seekrate,
      power: process.power,
      passes: process.passes,
    },
    {
      laserOn: stock?.laserOn,
      laserOff: stock?.laserOff,
      pre: stock?.pre,
      post: stock?.post,
      bedWidth: stock?.bedWidth,
      bedDepth: stock?.bedDepth,
      tokenSpace: stock?.tokenSpace,
      laserMaxPower: stock?.laserMaxPower,
    },
  )
  const svgText = exportLaserPolylinesToSvg(polylines)
  return {
    polylines,
    gcodeText,
    svgText,
    deviceId,
    fileExt: (stock?.fileExt || 'gcode').toLowerCase(),
    backend: opts.backend || 'kiri-ts',
  }
}

export function runLaserFromSvg(
  svgText: string,
  opts: { deviceId?: string; process?: LaserEngineProcess; backend?: LaserBackendKind } = {},
): LaserEngineResult {
  const polylines = parseSvgToLaserPolylines(svgText)
  if (!polylines.length) throw new Error('No cuttable paths found in SVG')
  return buildResult(polylines, opts)
}

export function runLaserFromDxf(
  dxfText: string,
  opts: { deviceId?: string; process?: LaserEngineProcess; backend?: LaserBackendKind } = {},
): LaserEngineResult {
  const polylines = parseDxfToLaserPolylines(dxfText)
  if (!polylines.length) throw new Error('No cuttable paths found in DXF')
  return buildResult(polylines, opts)
}

export function runLaserFromPolylines(
  polylines: LaserPolyline[],
  opts: { deviceId?: string; process?: LaserEngineProcess; backend?: LaserBackendKind } = {},
): LaserEngineResult {
  return buildResult(polylines, opts)
}

export const LASER_MODE_TYPE = {
  LASER: 0,
  DRAG: 1,
  WJET: 2,
  WEDM: 3,
} as const