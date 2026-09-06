import type { AppSettings } from '@/types/settings'
import { getSettings } from '@/api/settings'
import { tryParseWsSettingsRecord } from '@/api/wsSettingsRecord'
import type { FdmMaterial, MaterialSummary } from '@/types/material'

const mode = 'FDM'

// 内置材料占位（可后续补全）
const stockFdmMaterials: string[] = ['PLA', 'PETG', 'ABS']

export interface FdmMaterialList {
  stock: MaterialSummary[]
  local: MaterialSummary[]
}

export async function listFdmMaterials(): Promise<FdmMaterialList> {
  const ws = await getWsSettings()
  const mats = ws.materials?.[mode] ?? {}

  const localNames = Object.keys(mats)
  const local: MaterialSummary[] = localNames.map((name) => ({ name, mode: 'FDM', isLocal: true }))
  const stock: MaterialSummary[] = stockFdmMaterials.map((name) => ({ name, mode: 'FDM', isLocal: false }))

  return { stock, local }
}

export async function getFdmMaterial(name: string): Promise<FdmMaterial | null> {
  const ws = await getWsSettings()
  const rec = ws.materials?.[mode]?.[name]
  if (!rec) return null
  return rec as FdmMaterial
}

export async function saveFdmMaterial(name: string, material: FdmMaterial): Promise<void> {
  const ws = await getWsSettings()
  ws.materials = ws.materials || {}
  ws.materials[mode] = ws.materials[mode] || {}
  ws.materials[mode][name] = { ...material, name }
  ws.currentMaterial = ws.currentMaterial || {}
  ws.currentMaterial[mode] = name
  await setWsSettings(ws)
}

export async function deleteFdmMaterial(name: string): Promise<void> {
  const ws = await getWsSettings()
  if (!ws.materials?.[mode]) return
  delete ws.materials[mode][name]
  if (ws.currentMaterial?.[mode] === name) {
    ws.currentMaterial[mode] = 'PLA'
  }
  await setWsSettings(ws)
}

export async function cloneFdmMaterialFromCurrent(newName: string): Promise<void> {
  const ws = await getWsSettings()
  const curName = ws.currentMaterial?.[mode] ?? 'PLA'
  const cur = ws.materials?.[mode]?.[curName] ?? defaultFdmMaterial(curName)
  await saveFdmMaterial(newName, { ...(cur as FdmMaterial), name: newName })
}

function defaultFdmMaterial(name: string): FdmMaterial {
  // 基于常见默认值（后续可以对齐旧项目默认 process 字段）
  return {
    name,
    nozzleTemp: 200,
    bedTemp: 60,
    fanSpeed: 255,
    fanLayer: 1,
    flowMult: 1.0,
    retractDist: 1.5,
    retractSpeed: 40,
  }
}

async function getWsSettings(): Promise<any> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem('ws-settings')
  if (!raw) {
    const base: any = (await getSettings()) as AppSettings
    const defPLA = defaultFdmMaterial('PLA')
    return {
      ...base,
      materials: { [mode]: { PLA: defPLA } },
      currentMaterial: { [mode]: 'PLA' },
    }
  }
  const parsed = tryParseWsSettingsRecord(raw)
  if (!parsed) {
    const base: any = (await getSettings()) as AppSettings
    const defPLA = defaultFdmMaterial('PLA')
    return {
      ...base,
      materials: { [mode]: { PLA: defPLA } },
      currentMaterial: { [mode]: 'PLA' },
    }
  }
  const anyParsed = parsed as any
  anyParsed.materials = anyParsed.materials || {}
  anyParsed.materials[mode] = anyParsed.materials[mode] || {}
  if (!anyParsed.materials[mode].PLA) {
    anyParsed.materials[mode].PLA = defaultFdmMaterial('PLA')
  }
  anyParsed.currentMaterial = anyParsed.currentMaterial || {}
  anyParsed.currentMaterial[mode] = anyParsed.currentMaterial[mode] || 'PLA'
  return anyParsed
}

async function setWsSettings(settings: any): Promise<void> {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('ws-settings', JSON.stringify(settings))
}
