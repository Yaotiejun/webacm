import { describe, expect, it } from 'vitest'
import defaultKiriCamProcess from './defaults/kiri-cam-process.json'
import { getRiskLevelForKey } from './riskRules'

describe('cam.riskRules.getRiskLevelForKey', () => {
  it('marks key device and ops as high risk', () => {
    expect(getRiskLevelForKey('deviceName')).toBe('high')
    expect(getRiskLevelForKey('ops')).toBe('high')
    expect(getRiskLevelForKey('camCustomGcode')).toBe('high')
  })

  it('marks critical z controls as high risk', () => {
    expect(getRiskLevelForKey('camZBottom')).toBe('high')
    expect(getRiskLevelForKey('camZClearance')).toBe('high')
    expect(getRiskLevelForKey('camZAnchor')).toBe('high')
  })

  it('marks other z/feed controls as medium risk', () => {
    expect(getRiskLevelForKey('camZOffset')).toBe('medium')
    expect(getRiskLevelForKey('camFastFeed')).toBe('medium')
    expect(getRiskLevelForKey('camFastFeedZ')).toBe('medium')
    expect(getRiskLevelForKey('camDrillDown')).toBe('medium')
  })

  it('marks camZThru high and camOriginTop medium', () => {
    expect(getRiskLevelForKey('camZThru')).toBe('high')
    expect(getRiskLevelForKey('camOriginTop')).toBe('medium')
    expect(getRiskLevelForKey('camZOffset')).toBe('medium')
  })

  it('marks tolerance / conventional as medium and stock-on as high', () => {
    expect(getRiskLevelForKey('camTolerance')).toBe('medium')
    expect(getRiskLevelForKey('camConventional')).toBe('medium')
    expect(getRiskLevelForKey('camStockOn')).toBe('high')
  })

  it('marks origin center / stock trim / depth-first as medium', () => {
    expect(getRiskLevelForKey('camOriginCenter')).toBe('medium')
    expect(getRiskLevelForKey('camStockOffset')).toBe('medium')
    expect(getRiskLevelForKey('camStockClipTo')).toBe('medium')
    expect(getRiskLevelForKey('camDepthFirst')).toBe('medium')
    expect(getRiskLevelForKey('camZTop')).toBe('medium')
  })

  it('marks camOriginOff* medium and camExpertFast low', () => {
    expect(getRiskLevelForKey('camOriginOffX')).toBe('medium')
    expect(getRiskLevelForKey('camOriginOffZ')).toBe('medium')
    expect(getRiskLevelForKey('camExpertFast')).toBe('low')
  })

  it('marks arc output low and first-Z-max / ct-origin as medium', () => {
    expect(getRiskLevelForKey('camArcEnabled')).toBe('low')
    expect(getRiskLevelForKey('camFirstZMax')).toBe('medium')
    expect(getRiskLevelForKey('ctOriginCenter')).toBe('medium')
    expect(getRiskLevelForKey('ctOriginOffX')).toBe('medium')
  })

  it('marks output mirror and arc tuning as medium', () => {
    expect(getRiskLevelForKey('outputInvertX')).toBe('medium')
    expect(getRiskLevelForKey('outputInvertY')).toBe('medium')
    expect(getRiskLevelForKey('camArcTolerance')).toBe('medium')
    expect(getRiskLevelForKey('camArcResolution')).toBe('medium')
  })

  it('defaults unknown keys to low risk', () => {
    expect(getRiskLevelForKey('processName')).toBe('low')
    expect(getRiskLevelForKey('fixtureTag')).toBe('low')
  })

  it('marks stock envelope camStockX/Y/Z as medium', () => {
    expect(getRiskLevelForKey('camStockX')).toBe('medium')
    expect(getRiskLevelForKey('camStockY')).toBe('medium')
    expect(getRiskLevelForKey('camStockZ')).toBe('medium')
  })

  it('marks camLaser* process fields as medium', () => {
    expect(getRiskLevelForKey('camLaserSpeed')).toBe('medium')
    expect(getRiskLevelForKey('camLaserPower')).toBe('medium')
    expect(getRiskLevelForKey('camLaserAdaptive')).toBe('medium')
  })

  it('marks camLathe* and camHelical* process fields as medium', () => {
    expect(getRiskLevelForKey('camLatheSpeed')).toBe('medium')
    expect(getRiskLevelForKey('camLatheAngle')).toBe('medium')
    expect(getRiskLevelForKey('camHelicalDown')).toBe('medium')
    expect(getRiskLevelForKey('camHelicalSpeed')).toBe('medium')
  })

  it('marks camRegister* and camPocket* process fields as medium', () => {
    expect(getRiskLevelForKey('camRegisterThru')).toBe('medium')
    expect(getRiskLevelForKey('camRegisterOffset')).toBe('medium')
    expect(getRiskLevelForKey('camPocketDown')).toBe('medium')
    expect(getRiskLevelForKey('camPocketRefine')).toBe('medium')
  })

  it('marks camRough*, camOutline*, camTrace*, camContour*, camDrill* process fields as medium', () => {
    expect(getRiskLevelForKey('camRoughTool')).toBe('medium')
    expect(getRiskLevelForKey('camRoughDown')).toBe('medium')
    expect(getRiskLevelForKey('camOutlineSpeed')).toBe('medium')
    expect(getRiskLevelForKey('camTraceDown')).toBe('medium')
    expect(getRiskLevelForKey('camContourAngle')).toBe('medium')
    expect(getRiskLevelForKey('camDrillDown')).toBe('medium')
    expect(getRiskLevelForKey('camDrillLift')).toBe('medium')
    expect(getRiskLevelForKey('camDrillingOn')).toBe('medium')
  })

  it('marks camLevel*, camFlip*, camIndex*, camTabs*, camEase* and stock-index fields as medium', () => {
    expect(getRiskLevelForKey('camLevelDown')).toBe('medium')
    expect(getRiskLevelForKey('camLevelInset')).toBe('medium')
    expect(getRiskLevelForKey('camFlipAxis')).toBe('medium')
    expect(getRiskLevelForKey('camIndexAxis')).toBe('medium')
    expect(getRiskLevelForKey('camTabsDepth')).toBe('medium')
    expect(getRiskLevelForKey('camEaseDown')).toBe('medium')
    expect(getRiskLevelForKey('camStockIndexed')).toBe('medium')
    expect(getRiskLevelForKey('camStockIndexGrid')).toBe('medium')
  })

  it('marks camInnerFirst, camToolInit, camForceZMax, camFullEngage, camFlatness, camTrueShadow as medium', () => {
    expect(getRiskLevelForKey('camInnerFirst')).toBe('medium')
    expect(getRiskLevelForKey('camToolInit')).toBe('medium')
    expect(getRiskLevelForKey('camForceZMax')).toBe('medium')
    expect(getRiskLevelForKey('camFullEngage')).toBe('medium')
    expect(getRiskLevelForKey('camFlatness')).toBe('medium')
    expect(getRiskLevelForKey('camTrueShadow')).toBe('medium')
  })

  const LOW_CAM_RISK_FIELDS = new Set(['camExpertFast', 'camArcEnabled'])

  it('marks every cam* key in kiri-cam-process defaults at least medium (except arc/expert toggles)', () => {
    for (const key of Object.keys(defaultKiriCamProcess)) {
      if (!key.startsWith('cam')) continue
      if (LOW_CAM_RISK_FIELDS.has(key)) {
        expect(getRiskLevelForKey(key)).toBe('low')
      } else {
        expect(getRiskLevelForKey(key)).not.toBe('low')
      }
    }
  })
})
