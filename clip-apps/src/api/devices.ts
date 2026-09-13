import type { DeviceSummary, FdmDevice } from '@/types/device'
import type { AppSettings } from '@/types/settings'
import { getSettings, saveSettings } from '@/api/settings'
import { tryParseWsSettingsRecord } from '@/api/wsSettingsRecord'
import {
  getStockFdmDevice,
  listStockFdmDeviceIds,
  resolveStockFdmDeviceId,
} from '@/core/slicer/stock/fdm/stockFdmDevices'

export interface FdmDeviceList {
  stock: DeviceSummary[]
  local: DeviceSummary[]
}

export async function listFdmDevices(): Promise<FdmDeviceList> {
  const settings = await getSettingsFromWs()
  const mode = 'FDM'
  const devices = settings.devices ?? {}

  const local: DeviceSummary[] = Object.keys(devices).map((name) => ({
    name,
    mode,
    isLocal: true,
  }))

  const stock: DeviceSummary[] = listStockFdmDeviceIds().map((name) => ({
    name,
    mode,
    isLocal: false,
  }))

  return { stock, local }
}

/** Resolve local override first, then bundled stock JSON. */
export async function getFdmDevice(name: string): Promise<FdmDevice | null> {
  const settings = await getSettingsFromWs()
  const local = settings.devices?.[name] as FdmDevice | undefined
  if (local && typeof local === 'object' && local.bedWidth != null) {
    return local
  }
  return getStockFdmDevice(resolveStockFdmDeviceId(name))
}

export async function addLocalFdmDeviceFromCurrent(name: string): Promise<void> {
  const settings = await getSettingsFromWs()
  const devices = settings.devices ?? (settings.devices = {})
  const current = settings.device as FdmDevice | undefined
  if (!current) {
    throw new Error('当前配置中没有可用的 FDM 设备')
  }
  devices[name] = current as unknown as any
  settings.filter = settings.filter || {}
  settings.filter.FDM = name
  await saveSettingsToWs(settings)
}

export async function deleteLocalFdmDevice(name: string): Promise<void> {
  const settings = await getSettingsFromWs()
  if (!settings.devices) return
  delete settings.devices[name]
  if (settings.filter?.FDM === name) {
    settings.filter.FDM = 'Any.Generic.Marlin'
  }
  await saveSettingsToWs(settings)
}

async function getSettingsFromWs(): Promise<any> {
  if (typeof window === 'undefined') {
    return {} as any
  }
  const raw = window.localStorage.getItem('ws-settings')
  if (!raw) {
    const base: any = (await getSettings()) as AppSettings
    return {
      ...base,
      mode: 'FDM',
      devices: {},
      filter: { FDM: 'Any.Generic.Marlin' },
    }
  }
  const parsed = tryParseWsSettingsRecord(raw)
  if (!parsed) {
    const base: any = (await getSettings()) as AppSettings
    return {
      ...base,
      mode: 'FDM',
      devices: {},
      filter: { FDM: 'Any.Generic.Marlin' },
    }
  }
  return parsed as any
}

async function saveSettingsToWs(settings: any): Promise<void> {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('ws-settings', JSON.stringify(settings))
}
