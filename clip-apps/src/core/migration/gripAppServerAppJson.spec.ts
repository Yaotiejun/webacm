import { describe, expect, it } from 'vitest'
import { gripAppJsonToModuleMeta, parseGripAppJsonModule } from './gripAppServerAppJson'

describe('gripAppServerAppJson', () => {
  it('parses app.json host/static/secure fields', () => {
    const mod = parseGripAppJsonModule({
      name: 'demo',
      host: ['localhost:8080'],
      static: { '/app': 'www' },
      secure: true,
    })
    expect(mod?.name).toBe('demo')
    expect(gripAppJsonToModuleMeta(mod!).secure).toBe(true)
    expect(gripAppJsonToModuleMeta(mod!).static).toEqual({ '/app': 'www' })
  })
})
