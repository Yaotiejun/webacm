/**
 * Stock CAM device catalog (bundled Kiri-Moto `dev/cam` JSON).
 */
import type { CamDeviceConfig } from '@/types/cam'
import { normalizeCamDeviceJson } from '@/core/cam/normalizeCamDevice'

const modules = import.meta.glob('./devices/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>

function fileKeyToDeviceId(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.json$/i, '')
}

const cache = new Map<string, CamDeviceConfig>()

for (const [path, raw] of Object.entries(modules)) {
  const id = fileKeyToDeviceId(path)
  cache.set(id, normalizeCamDeviceJson(raw ?? {}, id))
}

export const STOCK_CAM_DEVICE_IDS: readonly string[] = Object.freeze([
  'Makera.Carvera',
  'Makera.Carvera.Air',
  'Any.Generic.Grbl',
  'Any.Generic.LinuxCNC',
  'Carbide3D.Shapeoko.3',
  'Sienci.LongMill',
  'Genmitsu.3018',
  'V1Engineering.MPCNC',
])

export function listStockCamDeviceIds(): string[] {
  const featured = STOCK_CAM_DEVICE_IDS.filter((id) => cache.has(id))
  const rest = [...cache.keys()].filter((id) => !featured.includes(id)).sort()
  return [...featured, ...rest]
}

/** Featured vs remaining bundled ids for picker optgroups. */
export function listStockCamDeviceIdsGrouped(): { featured: string[]; other: string[] } {
  const featured = STOCK_CAM_DEVICE_IDS.filter((id) => cache.has(id))
  const other = [...cache.keys()].filter((id) => !featured.includes(id)).sort()
  return { featured, other }
}

export function getStockCamDevice(name: string): CamDeviceConfig | null {
  return cache.get(name) ?? null
}

export function countBundledCamDevices(): number {
  return cache.size
}
