import type {
  DecimationStrongerThanRequestedWarning,
  GenericTexturizeWarning,
  SubdivSafetyCapHitWarning,
  TexturizeResult,
  TexturizeWarning,
} from '@/types/texturizer'
import { createSubdivSafetyCapHitWarning } from '@/core/texturizer/warningFactory'
import {
  TEXTURIZER_WARNING_CODES,
  TEXTURIZER_WARNING_DETAIL_KEYS,
  TEXTURIZER_WARNING_MESSAGE_MAP,
} from '@/types/texturizerWarnings'

export type WarningLevel = 'warning' | 'error'
export type WarningLine = { level: WarningLevel; text: string }

export function buildRunWarnings(meta: TexturizeResult['meta'] | null | undefined): TexturizeWarning[] {
  const warnings: TexturizeWarning[] = []
  if (meta?.subdivSafetyCapHit) {
    warnings.push(createSubdivSafetyCapHitWarning(meta.postSubdivTriCount))
  }
  return warnings
}

export function normalizeWarning(w: TexturizeWarning | string): TexturizeWarning {
  const toToken = (input: string): string => input.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'warning'
  const inferLevel = (text: string): WarningLevel => {
    const s = text.toLowerCase()
    return s.includes('safety cap hit') || s.includes('oom') || s.includes('failed') ? 'error' : 'warning'
  }
  const toLegacyCode = (input: string): GenericTexturizeWarning['code'] => `legacy_${toToken(input)}`
  const toUnknownCode = (input: string): GenericTexturizeWarning['code'] => `unknown_${toToken(input)}`

  if (typeof w === 'string') {
    return {
      code: toLegacyCode(w),
      level: inferLevel(w),
      message: w,
    }
  }

  if (w.code === TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT || w.code === TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED) {
    return w
  }

  if (w.code.startsWith('legacy_') || w.code.startsWith('unknown_')) return w

  const fallbackMessage = (w.message ?? w.code).trim() || 'unknown warning'
  return {
    code: toUnknownCode(w.code || fallbackMessage),
    level: w.level === 'error' ? 'error' : 'warning',
    message: w.message ?? w.code,
    details: w.details,
  }
}

function getWarningDisplayMessage(w: TexturizeWarning): string {
  const mapped = TEXTURIZER_WARNING_MESSAGE_MAP[w.code]
  if (mapped) return mapped
  const msg = (w.message ?? '').trim()
  if (msg) return msg
  return w.code
}

function toFiniteNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function formatPercent(v: unknown, digits = 1): string | null {
  const n = toFiniteNumber(v)
  if (n == null) return null
  return `${(n * 100).toFixed(digits)}%`
}

function formatFixed(v: unknown, digits = 4): string | null {
  const n = toFiniteNumber(v)
  if (n == null) return null
  return n.toFixed(digits)
}

function formatWarningDetails(w: TexturizeWarning): string | null {
  const d = w.details
  if (!d || typeof d !== 'object') return null

  if (w.code === TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED) {
    const details = d as NonNullable<DecimationStrongerThanRequestedWarning['details']>
    const requested = formatPercent(details[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.REQUESTED_RATIO], 1)
    const kept = formatPercent(details[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.KEPT_RATIO], 1)
    const pre = toFiniteNumber(details[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.PRE_TRI_COUNT])
    const post = toFiniteNumber(details[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.POST_TRI_COUNT])
    const parts: string[] = []
    if (requested) parts.push(`requested=${requested}`)
    if (kept) parts.push(`kept=${kept}`)
    if (pre != null) parts.push(`tri=${pre}`)
    if (post != null) parts.push(`tri_after=${post}`)
    return parts.length ? parts.join(', ') : null
  }

  if (w.code === TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT) {
    const details = d as NonNullable<SubdivSafetyCapHitWarning['details']>
    const cap = toFiniteNumber(details[TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.SAFETY_TRIANGLES])
    const tri = toFiniteNumber(details[TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.POST_SUBDIV_TRI_COUNT])
    const parts: string[] = []
    if (cap != null) parts.push(`cap=${cap}`)
    if (tri != null) parts.push(`tri=${tri}`)
    return parts.length ? parts.join(', ') : null
  }

  const kv = Object.entries(d)
    .map(([k, v]) => {
      const asPercent = k.toLowerCase().includes('ratio') ? formatPercent(v, 1) : null
      if (asPercent) return `${k}=${asPercent}`
      const asFixed = typeof v === 'number' ? formatFixed(v, 4) : null
      if (asFixed) return `${k}=${asFixed}`
      return `${k}=${String(v)}`
    })
    .filter((s) => s.length > 0)
  return kv.length ? kv.join(', ') : null
}

export function getWarningsTooltipLines(warnings: TexturizeWarning[]): WarningLine[] {
  return warnings.map((w) => {
    const level: WarningLevel = w.level === 'error' ? 'error' : 'warning'
    const base = getWarningDisplayMessage(w)
    const suffix = formatWarningDetails(w)
    const text = suffix ? `${base} | ${suffix}` : base
    return { level, text }
  })
}

export function getWarningsTagType(warnings: TexturizeWarning[]): 'warning' | 'danger' {
  return warnings.some((w) => w.level === 'error') ? 'danger' : 'warning'
}

export function getWarningsTagLabel(warnings: TexturizeWarning[]): string {
  const count = warnings.length
  if (count <= 0) return 'WARN(0)'
  const hasError = warnings.some((w) => w.level === 'error')
  return `${hasError ? 'ERR' : 'WARN'}(${count})`
}
