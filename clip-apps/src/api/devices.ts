import type { DeviceSummary, FdmDevice } from '@/types/device'
import type { AppSettings } from '@/types/settings'
import { getSettings, saveSettings } from '@/api/settings'
import { tryParseWsSettingsRecord } from '@/api/wsSettingsRecord'

// 预置的内置设备列表名称（来自旧项目 devlist[fdm] 的 keys，先简单写几个占位）
const stockFdmDevices: string[] = [
  'Any.Generic.Marlin',
]

export interface FdmDeviceList {
  stock: DeviceSummary[]
  local: DeviceSummary[]
}

export async function listFdmDevices(): Promise<FdmDeviceList> {
  const settings = await getSettingsFromWs()
  const mode = 'FDM'
  const filterName = settings.filter?.[mode] ?? 'Any.Generic.Marlin'
  const devices = settings.devices ?? {}

  const local: DeviceSummary[] = Object.keys(devices).map((name) => ({
    name,
    mode,
    isLocal: true,
  }))

  const stock: DeviceSummary[] = stockFdmDevices.map((name) => ({
    name,
    mode,
    isLocal: false,
  }))

  return {
    stock,
    local,
  }
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
  // 我们当前的 getSettings 返回的是 AppSettings，只包含 controller。
  // 为了与 ws-settings 对齐，这里直接从 localStorage 读原始结构（如果存在）。
  if (typeof window === 'undefined') {
    return {} as any
  }
  const raw = window.localStorage.getItem('ws-settings')
  if (!raw) {
    const base: any = (await getSettings()) as AppSettings
    // 填补 devices/filter 结构
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
