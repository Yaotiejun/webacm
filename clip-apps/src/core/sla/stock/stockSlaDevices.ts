/**
 * Stock SLA device catalog (bundled Kiri-Moto `dev/sla` JSON).
 */
import { normalizeSlaDeviceJson, type SlaDeviceConfig } from '@/core/sla/normalizeSlaDevice'

const modules = import.meta.glob('./devices/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>

function fileKeyToDeviceId(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.json$/i, '')
}

const cache = new Map<string, SlaDeviceConfig>()

for (const [path, raw] of Object.entries(modules)) {
  const id = fileKeyToDeviceId(path)
  cache.set(id, normalizeSlaDeviceJson(raw ?? {}, id))
}

export const STOCK_SLA_DEVICE_IDS: readonly string[] = Object.freeze([
  'Anycubic.Photon',
  'Any.Generic.Chitubox.CTB',
  'Elegoo.Mars.3.CTB',
])

export function listStockSlaDeviceIds(): string[] {
  const featured = STOCK_SLA_DEVICE_IDS.filter((id) => cache.has(id))
  const rest = [...cache.keys()].filter((id) => !featured.includes(id)).sort()
  return [...featured, ...rest]
}

export function getStockSlaDevice(name: string): SlaDeviceConfig | null {
  return cache.get(name) ?? null
}

export function countBundledSlaDevices(): number {
  return cache.size
}
