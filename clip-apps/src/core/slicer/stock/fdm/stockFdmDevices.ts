/**
 * Stock FDM device catalog (bundled Kiri-Moto `dev/fdm` JSON).
 */
import type { FdmDevice } from '@/types/device'
import { normalizeFdmDeviceJson } from '@/core/slicer/normalizeFdmDevice'

const modules = import.meta.glob('./devices/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Record<string, unknown>
>

function fileKeyToDeviceId(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.json$/i, '')
}

const cache = new Map<string, FdmDevice>()

for (const [path, raw] of Object.entries(modules)) {
  const id = fileKeyToDeviceId(path)
  cache.set(id, normalizeFdmDeviceJson(raw ?? {}, id))
}

/** Aliases so UI names map onto bundled files. */
const ALIASES: Record<string, string> = {
  'Prusa.MK3': 'Prusa.i3.MK3S+',
  'Prusa.Mini': 'Prusa.mini',
  'Bambu.X1C': 'Bambu.P1S',
  'Voron.2.4': 'Any.Generic.Klipper',
}

/** Featured ordering for the device picker; remaining bundled ids follow alphabetically. */
export const STOCK_FDM_DEVICE_IDS: readonly string[] = Object.freeze([
  'Any.Generic.Marlin',
  'Any.Generic.Klipper',
  'Creality.Ender.3',
  'Creality.Ender.5',
  'Creality.Ender.6',
  'Creality.Ender.7',
  'Creality.K1',
  'Creality.CR-10S',
  'Creality.CR-30',
  'Prusa.i3.MK2S',
  'Prusa.i3.MK3S+',
  'Prusa.mini',
  'Bambu.A1',
  'Bambu.P1S',
  'Anycubic.Kobra',
  'Anycubic.Kobra.2',
  'Anycubic.i3.Mega',
  'Flashforge.Adventurer.5M',
  'FLSUN.QQ-S',
  'Raise3D.N2',
  'Snapmaker.Original',
  'Ultimaker.Ultimaker2',
])

export function listStockFdmDeviceIds(): string[] {
  const featured = STOCK_FDM_DEVICE_IDS.filter((id) => cache.has(id))
  const rest = [...cache.keys()].filter((id) => !featured.includes(id)).sort()
  return [...featured, ...rest]
}

/** Featured vs remaining bundled ids for picker optgroups. */
export function listStockFdmDeviceIdsGrouped(): { featured: string[]; other: string[] } {
  const featured = STOCK_FDM_DEVICE_IDS.filter((id) => cache.has(id))
  const other = [...cache.keys()].filter((id) => !featured.includes(id)).sort()
  return { featured, other }
}

export function getStockFdmDevice(name: string): FdmDevice | null {
  const key = ALIASES[name] ?? name
  return cache.get(key) ?? null
}

export function resolveStockFdmDeviceId(name: string): string {
  return ALIASES[name] ?? name
}

export function countBundledFdmDevices(): number {
  return cache.size
}
