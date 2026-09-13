/**
 * Stock laser device catalog (bundled Kiri-Moto `dev/laser` JSON).
 */
import { normalizeLaserDeviceJson, type LaserDeviceConfig } from '@/core/laser/normalizeLaserDevice'

const modules = import.meta.glob('./devices/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>

function fileKeyToDeviceId(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.json$/i, '')
}

const cache = new Map<string, LaserDeviceConfig>()

for (const [path, raw] of Object.entries(modules)) {
  const id = fileKeyToDeviceId(path)
  cache.set(id, normalizeLaserDeviceJson(raw ?? {}, id))
}

export const STOCK_LASER_DEVICE_IDS: readonly string[] = Object.freeze([
  'Any.Generic.Laser',
  'Glowforge',
  'Snapmaker.A250T',
  'xTool.D1',
])

export function listStockLaserDeviceIds(): string[] {
  const featured = STOCK_LASER_DEVICE_IDS.filter((id) => cache.has(id))
  const rest = [...cache.keys()].filter((id) => !featured.includes(id)).sort()
  return [...featured, ...rest]
}

export function getStockLaserDevice(name: string): LaserDeviceConfig | null {
  return cache.get(name) ?? null
}

export function countBundledLaserDevices(): number {
  return cache.size
}
