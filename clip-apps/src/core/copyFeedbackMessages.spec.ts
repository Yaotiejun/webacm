import { describe, expect, it } from 'vitest'
import {
  CAM_ACTION_ERROR,
  CAM_ACTION_SUCCESS,
  CAM_ACTION_WARNING,
  CAM_COPY_EMPTY,
  CAM_COPY_SUCCESS,
  CAM_DIALOG_MESSAGE,
  CAM_EXPORT_EMPTY,
  CAM_EXPORT_SUCCESS,
  CAM_IMPORT_MESSAGE,
  COPY_FAILURE_MESSAGE,
  FDM_ACTION_ERROR,
  FDM_ACTION_INFO,
  FDM_ACTION_SUCCESS,
  FDM_ACTION_WARNING,
  FDM_COPY_EMPTY,
  FDM_COPY_SUCCESS,
  FDM_EXPORT_EMPTY,
  FDM_EXPORT_SUCCESS,
  UNKNOWN_ERROR_MESSAGE,
} from './copyFeedbackMessages'

describe('core.copyFeedbackMessages', () => {
  it('exposes stable clipboard failure copy', () => {
    expect(COPY_FAILURE_MESSAGE).toBe('复制失败：请检查剪贴板权限')
  })

  it('exposes unknown error sentinel', () => {
    expect(UNKNOWN_ERROR_MESSAGE).toBe('未知错误')
  })

  it('keeps CAM and FDM comparison bundle success labels distinct', () => {
    expect(CAM_COPY_SUCCESS.comparisonBundle).toContain('CAM')
    expect(FDM_COPY_SUCCESS.comparisonBundle).toContain('FDM')
  })

  it('all bounded feedback maps use non-empty string values (migration guard)', () => {
    const maps: Record<string, Record<string, string>> = {
      CAM_COPY_SUCCESS: CAM_COPY_SUCCESS as unknown as Record<string, string>,
      CAM_COPY_EMPTY: CAM_COPY_EMPTY as unknown as Record<string, string>,
      CAM_EXPORT_SUCCESS: CAM_EXPORT_SUCCESS as unknown as Record<string, string>,
      CAM_EXPORT_EMPTY: CAM_EXPORT_EMPTY as unknown as Record<string, string>,
      CAM_ACTION_SUCCESS: CAM_ACTION_SUCCESS as unknown as Record<string, string>,
      CAM_ACTION_WARNING: CAM_ACTION_WARNING as unknown as Record<string, string>,
      CAM_ACTION_ERROR: CAM_ACTION_ERROR as unknown as Record<string, string>,
      CAM_IMPORT_MESSAGE: CAM_IMPORT_MESSAGE as unknown as Record<string, string>,
      CAM_DIALOG_MESSAGE: CAM_DIALOG_MESSAGE as unknown as Record<string, string>,
      FDM_COPY_SUCCESS: FDM_COPY_SUCCESS as unknown as Record<string, string>,
      FDM_COPY_EMPTY: FDM_COPY_EMPTY as unknown as Record<string, string>,
      FDM_EXPORT_SUCCESS: FDM_EXPORT_SUCCESS as unknown as Record<string, string>,
      FDM_EXPORT_EMPTY: FDM_EXPORT_EMPTY as unknown as Record<string, string>,
      FDM_ACTION_SUCCESS: FDM_ACTION_SUCCESS as unknown as Record<string, string>,
      FDM_ACTION_WARNING: FDM_ACTION_WARNING as unknown as Record<string, string>,
      FDM_ACTION_INFO: FDM_ACTION_INFO as unknown as Record<string, string>,
      FDM_ACTION_ERROR: FDM_ACTION_ERROR as unknown as Record<string, string>,
    }
    for (const [mapName, rec] of Object.entries(maps)) {
      for (const [key, val] of Object.entries(rec)) {
        expect(typeof val, `${mapName}.${key}`).toBe('string')
        expect(val.trim().length, `${mapName}.${key}`).toBeGreaterThan(0)
      }
    }
    expect(COPY_FAILURE_MESSAGE.trim().length).toBeGreaterThan(0)
    expect(UNKNOWN_ERROR_MESSAGE.trim().length).toBeGreaterThan(0)
  })
})
