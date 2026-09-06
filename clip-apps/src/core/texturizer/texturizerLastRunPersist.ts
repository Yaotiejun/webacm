import { clonePlain } from '@/core/clonePlain'

const STORAGE_KEY = 'ws-texturizer-last-run-params'

export interface TexturizerLastRunParams {
  savedAt: number
  amplitude: number
  frequency: number
  mappingMode: number
  scaleU: number
  scaleV: number
  offsetU: number
  offsetV: number
  rotationDeg: number
  mappingBlend: number
  seamBandWidth: number
  capAngle: number
  topAngleLimit: number
  bottomAngleLimit: number
  exclusionMode: 'exclude' | 'include'
  subdivisionLevels: number
  decimationRatio: number
  symmetricDisplacement: boolean
}

export function saveTexturizerLastRunParams(params: Omit<TexturizerLastRunParams, 'savedAt'>): void {
  const snap: TexturizerLastRunParams = { savedAt: Date.now(), ...clonePlain(params) }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
  } catch {
    // quota
  }
}

export function loadTexturizerLastRunParams(): TexturizerLastRunParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const snap = JSON.parse(raw) as TexturizerLastRunParams
    if (typeof snap?.amplitude !== 'number' || typeof snap?.frequency !== 'number') return null
    return snap
  } catch {
    return null
  }
}

export function clearTexturizerLastRunParams(): void {
  localStorage.removeItem(STORAGE_KEY)
}
