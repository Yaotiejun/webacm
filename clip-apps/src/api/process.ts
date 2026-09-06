import type { AppSettings } from '@/types/settings'
import type { FdmProcess, ProcessSummary } from '@/types/process'
import { getSettings } from '@/api/settings'
import { tryParseWsSettingsRecord } from '@/api/wsSettingsRecord'

const mode = 'FDM'

// 内置 profile 名称占位（后续可从旧项目内置 profiles 导出）
const stockFdmProfiles: string[] = ['default']

export interface FdmProcessList {
  stock: ProcessSummary[]
  local: ProcessSummary[]
}

export async function listFdmProcesses(): Promise<FdmProcessList> {
  const settings = await getWsSettings()
  const sproc = settings.sproc?.[mode] ?? {}

  const localNames = Object.keys(sproc)
  const local: ProcessSummary[] = localNames.map((name) => ({ name, mode: 'FDM', isLocal: true }))
  const stock: ProcessSummary[] = stockFdmProfiles.map((name) => ({ name, mode: 'FDM', isLocal: false }))

  return { stock, local }
}

export async function getFdmProcess(name: string): Promise<FdmProcess | null> {
  const settings = await getWsSettings()
  const rec = settings.sproc?.[mode]?.[name]
  if (!rec) return null
  return rec as FdmProcess
}

export async function saveFdmProcess(name: string, proc: FdmProcess): Promise<void> {
  const settings = await getWsSettings()
  settings.sproc = settings.sproc || {}
  settings.sproc[mode] = settings.sproc[mode] || {}
  settings.sproc[mode][name] = {
    ...proc,
    processName: name,
  }
  // 记录当前 mode 下的最近使用 profile
  settings.cproc = settings.cproc || {}
  settings.cproc[mode] = name

  await setWsSettings(settings)
}

export async function deleteFdmProcess(name: string): Promise<void> {
  const settings = await getWsSettings()
  if (!settings.sproc?.[mode]) return
  delete settings.sproc[mode][name]
  if (settings.cproc?.[mode] === name) {
    settings.cproc[mode] = 'default'
  }
  await setWsSettings(settings)
}

export async function cloneFdmProcessFromCurrent(newName: string): Promise<void> {
  const settings = await getWsSettings()
  const currentName = settings.cproc?.[mode] ?? 'default'
  const current = settings.sproc?.[mode]?.[currentName]
  if (!current) {
    throw new Error('当前配置中没有可用的工艺 profile')
  }
  await saveFdmProcess(newName, { ...(current as FdmProcess), processName: newName })
}

function defaultFdmProcess(): FdmProcess {
  return {
    processName: 'default',
    outputTemp: 200,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 0,
    firstLayerBedTemp: 0,
    outputFeedrate: 50,
    outputSeekrate: 80,
    firstLayerRate: 30,
    sliceHeight: 0.25,
    firstSliceHeight: 0.25,
    sliceTopLayers: 3,
    sliceBottomLayers: 3,
    sliceShells: 3,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.25,
    sliceFillType: 'grid',
    sliceFillOverlap: 0.15,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.4,
    sliceSupportSize: 4,
    sliceSupportAngle: 45,
    outputRetractDist: 1.5,
    outputRetractSpeed: 40,
    outputFanSpeed: 255,
    outputFanLayer: 1,
    outputMinLayerTime: 10,
    zHopDistance: 0.2,
  }
}

async function getWsSettings(): Promise<any> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem('ws-settings')
  if (!raw) {
    const base: any = (await getSettings()) as AppSettings
    const def = defaultFdmProcess()
    return {
      ...base,
      mode: mode,
      sproc: { [mode]: { default: def } },
      cproc: { [mode]: 'default' },
    }
  }
  const parsed = tryParseWsSettingsRecord(raw)
  if (!parsed) {
    const base: any = (await getSettings()) as AppSettings
    const def = defaultFdmProcess()
    return {
      ...base,
      mode: mode,
      sproc: { [mode]: { default: def } },
      cproc: { [mode]: 'default' },
    }
  }
  const anyParsed = parsed as any
  // 确保最基本结构存在
  anyParsed.sproc = anyParsed.sproc || {}
  anyParsed.sproc[mode] = anyParsed.sproc[mode] || {}
  if (!anyParsed.sproc[mode].default) {
    anyParsed.sproc[mode].default = defaultFdmProcess()
  }
  anyParsed.cproc = anyParsed.cproc || {}
  anyParsed.cproc[mode] = anyParsed.cproc[mode] || 'default'
  return anyParsed
}

async function setWsSettings(settings: any): Promise<void> {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('ws-settings', JSON.stringify(settings))
}
