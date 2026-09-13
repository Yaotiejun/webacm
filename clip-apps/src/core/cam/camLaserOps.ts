/**
 * Default CAM laser attachment ops (grip cl-ops laser on/off).
 */
import type { CamOperationInstance } from '@/types/cam'

export function createLaserOnOp(partial?: Partial<CamOperationInstance>): CamOperationInstance {
  return {
    type: 'laser on',
    tool: 1,
    power: 1,
    adapt: true,
    adaptrp: true,
    flat: false,
    flatz: 0,
    minp: 0.1,
    maxp: 1,
    minz: 0,
    maxz: 0,
    down: 0.2,
    step: 0.1,
    ...partial,
  }
}

export function createLaserOffOp(partial?: Partial<CamOperationInstance>): CamOperationInstance {
  return {
    type: 'laser off',
    ...partial,
  }
}

export function isLaserCamOp(op: CamOperationInstance | null | undefined): boolean {
  return op?.type === 'laser on' || op?.type === 'laser off' || op?.type === 'laser'
}
