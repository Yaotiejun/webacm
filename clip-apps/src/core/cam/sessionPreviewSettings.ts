export interface SessionPreviewSettingsPayload {
  schemaVersion: number
  previewLimit: number
}
import { createJsonExportArtifact } from './exportArtifacts'

export const SESSION_PREVIEW_SETTINGS_SCHEMA_VERSION = 1
export const SESSION_PREVIEW_LIMIT_OPTIONS = [8, 12, 20] as const
export const DEFAULT_SESSION_PREVIEW_LIMIT = SESSION_PREVIEW_LIMIT_OPTIONS[0]
export const CAM_BUNDLE_PREVIEW_LIMIT_KEY = 'ws-cam-bundle-preview-limit'

export interface SessionPreviewSettingsImportResult {
  previewLimit: number
  warning?: string
}

export interface SessionPreviewSettingsExportArtifact {
  filename: string
  json: string
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function isValidSessionPreviewLimit(limit: number): limit is (typeof SESSION_PREVIEW_LIMIT_OPTIONS)[number] {
  return SESSION_PREVIEW_LIMIT_OPTIONS.includes(limit as (typeof SESSION_PREVIEW_LIMIT_OPTIONS)[number])
}

export function normalizeSessionPreviewLimit(limit: number): (typeof SESSION_PREVIEW_LIMIT_OPTIONS)[number] {
  return isValidSessionPreviewLimit(limit) ? limit : DEFAULT_SESSION_PREVIEW_LIMIT
}

export function loadSessionPreviewLimitFromStorage(
  storage: StorageLike,
): (typeof SESSION_PREVIEW_LIMIT_OPTIONS)[number] {
  try {
    const raw = storage.getItem(CAM_BUNDLE_PREVIEW_LIMIT_KEY)
    const n = raw ? Number(raw) : NaN
    return normalizeSessionPreviewLimit(n)
  } catch {
    return DEFAULT_SESSION_PREVIEW_LIMIT
  }
}

export function saveSessionPreviewLimitToStorage(
  storage: StorageLike,
  limit: number,
): (typeof SESSION_PREVIEW_LIMIT_OPTIONS)[number] {
  const normalized = normalizeSessionPreviewLimit(limit)
  try {
    storage.setItem(CAM_BUNDLE_PREVIEW_LIMIT_KEY, String(normalized))
  } catch {
    // ignore storage errors by design
  }
  return normalized
}

export function createSessionPreviewSettingsPayload(limit: number): SessionPreviewSettingsPayload {
  return {
    schemaVersion: SESSION_PREVIEW_SETTINGS_SCHEMA_VERSION,
    previewLimit: normalizeSessionPreviewLimit(limit),
  }
}

export function createSessionPreviewSettingsExportArtifact(limit: number, now = new Date()): SessionPreviewSettingsExportArtifact {
  const payload = createSessionPreviewSettingsPayload(limit)
  return createJsonExportArtifact('cam-session-preview-settings', payload, now)
}

export function resolveSessionPreviewSettingsPayload(payload: unknown): SessionPreviewSettingsImportResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid payload')
  }
  const obj = payload as Partial<SessionPreviewSettingsPayload>
  const schemaVersion = Number(obj.schemaVersion)
  const previewLimit = Number(obj.previewLimit)

  if (!isValidSessionPreviewLimit(previewLimit)) {
    throw new Error('invalid previewLimit')
  }

  if (schemaVersion === 1 || !Number.isFinite(schemaVersion)) {
    return { previewLimit }
  }
  return {
    previewLimit,
    warning: `预览设置 schemaVersion=${schemaVersion}，尝试按兼容模式读取`,
  }
}
