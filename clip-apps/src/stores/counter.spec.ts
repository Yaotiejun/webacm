import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCounterStore } from './counter'

describe('stores.counter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes count and doubleCount to zero', () => {
    const s = useCounterStore()
    expect(s.count).toBe(0)
    expect(s.doubleCount).toBe(0)
  })

  it('increment updates count and doubleCount', () => {
    const s = useCounterStore()
    s.increment()
    expect(s.count).toBe(1)
    expect(s.doubleCount).toBe(2)
    s.increment()
    expect(s.count).toBe(2)
    expect(s.doubleCount).toBe(4)
  })
})
