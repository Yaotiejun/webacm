/** Mirror of device-bridge Carvera SD path rules (browser-safe). */
export const CARVERA_SD_GCODES_ROOT = '/sd/gcodes/'

export function sanitizeCarveraSdPath(raw: string, fallbackName = 'job.nc'): string {
  let path = String(raw || '').trim().replace(/ /g, '_')
  if (!path.startsWith(CARVERA_SD_GCODES_ROOT)) {
    const name = (path.split(/[/\\]/).pop() || fallbackName).replace(/ /g, '_')
    path = `${CARVERA_SD_GCODES_ROOT}${name}`
  }
  return path
}

export function carveraSdPathFromJobName(name: string): string {
  const base = (name || 'job').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_')
  const withExt = /\.(nc|gcode|ngc|cnc|tap)$/i.test(base) ? base : `${base}.nc`
  return sanitizeCarveraSdPath(`${CARVERA_SD_GCODES_ROOT}${withExt}`)
}
