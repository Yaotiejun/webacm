import type { AppSettings } from '@/types/settings'
import { getSettings } from '@/api/settings'
import { tryParseWsSettingsRecord } from '@/api/wsSettingsRecord'
import { listFdmDevices } from '@/api/devices'
import { listFdmProcesses } from '@/api/process'
import { listFdmMaterials } from '@/api/material'

export interface CurrentFdmConfig {
  mode: 'FDM'
  device: string
  process: string
  material: string
  devices: string[]
  processes: string[]
  materials: string[]
}

export async function getCurrentFdmConfig(): Promise<CurrentFdmConfig> {
  if (typeof window === 'undefined') {
    return {
      mode: 'FDM',
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      devices: [],
      processes: [],
      materials: [],
    }
  }

  const raw = window.localStorage.getItem('ws-settings')
  const baseDefaults = async () => {
    const base: any = (await getSettings()) as AppSettings
    return {
      ...base,
      mode: 'FDM',
      filter: { FDM: 'Any.Generic.Marlin' },
      cproc: { FDM: 'default' },
      currentMaterial: { FDM: 'PLA' },
    }
  }
  let ws: any
  if (!raw) {
    ws = await baseDefaults()
  } else {
    const parsed = tryParseWsSettingsRecord(raw)
    ws = parsed ? (parsed as any) : await baseDefaults()
  }

  const devList = await listFdmDevices()
  const procList = await listFdmProcesses()
  const matList = await listFdmMaterials()

  const device = ws.filter?.FDM ?? devList.local[0]?.name ?? 'Any.Generic.Marlin'
  const process = ws.cproc?.FDM ?? procList.local[0]?.name ?? 'default'
  const material = ws.currentMaterial?.FDM ?? matList.local[0]?.name ?? 'PLA'

  return {
    mode: 'FDM',
    device,
    process,
    material,
    devices: [
      ...devList.local.map((d) => d.name),
      ...devList.stock.map((d) => d.name),
    ],
    processes: [
      ...procList.local.map((p) => p.name),
      ...procList.stock.map((p) => p.name),
    ],
    materials: [
      ...matList.local.map((m) => m.name),
      ...matList.stock.map((m) => m.name),
    ],
  }
}

export async function setCurrentFdmConfig(partial: Partial<Pick<CurrentFdmConfig, 'device' | 'process' | 'material'>>): Promise<void> {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem('ws-settings')
  const baseDefaults = async () => {
    const base: any = (await getSettings()) as AppSettings
    return {
      ...base,
      mode: 'FDM',
      filter: { FDM: 'Any.Generic.Marlin' },
      cproc: { FDM: 'default' },
      currentMaterial: { FDM: 'PLA' },
    }
  }
  let ws: any
  if (!raw) {
    ws = await baseDefaults()
  } else {
    const parsed = tryParseWsSettingsRecord(raw)
    ws = parsed ? (parsed as any) : await baseDefaults()
  }

  if (partial.device) {
    ws.filter = ws.filter || {}
    ws.filter.FDM = partial.device
  }
  if (partial.process) {
    ws.cproc = ws.cproc || {}
    ws.cproc.FDM = partial.process
  }
  if (partial.material) {
    ws.currentMaterial = ws.currentMaterial || {}
    ws.currentMaterial.FDM = partial.material
  }

  window.localStorage.setItem('ws-settings', JSON.stringify(ws))
}
