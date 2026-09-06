import { describe, expect, it, vi } from 'vitest'
import { waitUnlessSendCanceled } from './deviceJobSendLoop'

describe('waitUnlessSendCanceled', () => {
  it('returns true when not paused', async () => {
    expect(await waitUnlessSendCanceled(() => false, () => false, 1)).toBe(true)
  })

  it('returns false when canceled while paused', async () => {
    let paused = true
    let canceled = false
    const p = waitUnlessSendCanceled(
      () => canceled,
      () => paused,
      5,
    )
    setTimeout(() => {
      canceled = true
    }, 15)
    expect(await p).toBe(false)
  })
})
