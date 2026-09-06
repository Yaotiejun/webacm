import type { AppSettings } from '@/types/settings'
import { getSettings } from '@/api/settings'
import { tryParseWsSettingsRecord } from '@/api/wsSettingsRecord'

export interface CurrentKeys {
  device: string
  process: string
  material: string
}

function baseDefaults(): any {
  return {
    mode: 'FDM',
    filter: { FDM: 'Any.Generic.Marlin' },
    cproc: { FDM: 'default' },
    currentMaterial: { FDM: 'PLA' },
  }
}

export async function readWsSettings(): Promise<any> {
  if (typeof window === 'undefined') return baseDefaults()
  const raw = window.localStorage.getItem('ws-settings')
  if (!raw) {
    const base: any = (await getSettings()) as AppSettings
    return { ...base, ...baseDefaults() }
  }
  const parsed = tryParseWsSettingsRecord(raw)
  if (!parsed) {
    const base: any = (await getSettings()) as AppSettings
    return { ...base, ...baseDefaults() }
  }
  return parsed as any
}

export async function writeWsSettings(patch: (ws: any) => void | any): Promise<void> {
  if (typeof window === 'undefined') return
  const ws = await readWsSettings()
  patch(ws)
  window.localStorage.setItem('ws-settings', JSON.stringify(ws))
}

export async function readCurrentKeys(): Promise<CurrentKeys> {
  const ws = await readWsSettings()
  return {
    device: ws.filter?.FDM ?? 'Any.Generic.Marlin',
    process: ws.cproc?.FDM ?? 'default',
    material: ws.currentMaterial?.FDM ?? 'PLA',
  }
}

export async function setCurrentDevice(name: string): Promise<void> {
  await writeWsSettings((ws) => {
    ws.filter = ws.filter || {}
    ws.filter.FDM = name
  })
}

export async function setCurrentProcess(name: string): Promise<void> {
  await writeWsSettings((ws) => {
    ws.cproc = ws.cproc || {}
    ws.cproc.FDM = name
  })
}

export async function setCurrentMaterial(name: string): Promise<void> {
  await writeWsSettings((ws) => {
    ws.currentMaterial = ws.currentMaterial || {}
    ws.currentMaterial.FDM = name
  })
}
