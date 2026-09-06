import { describe, expect, it } from 'vitest'
import { evaluateGripAppModuleGate } from './gripAppServerModuleGate'

describe('gripAppServerModuleGate', () => {
  it('requires HTTPS when meta.secure is true', () => {
    const http = evaluateGripAppModuleGate({
      host: 'localhost',
      allowedHosts: ['*'],
      metaSecure: true,
      requestSecure: false,
    })
    expect(http.secOk).toBe(false)
    expect(http.allowed).toBe(false)

    const https = evaluateGripAppModuleGate({
      host: 'localhost',
      allowedHosts: ['*'],
      metaSecure: true,
      requestSecure: true,
    })
    expect(https.allowed).toBe(true)
  })

  it('honors test and testv referer query', () => {
    const blocked = evaluateGripAppModuleGate({
      host: 'localhost',
      allowedHosts: ['localhost'],
      requestSecure: false,
      test: () => false,
      testv: () => false,
      referer: 'http://x/y?token=1',
    })
    expect(blocked.modOk).toBe(false)

    const viaTestv = evaluateGripAppModuleGate({
      host: 'localhost',
      allowedHosts: ['localhost'],
      requestSecure: false,
      test: () => false,
      testv: (q) => q === 'token=1',
      referer: 'http://x/y?token=1',
    })
    expect(viaTestv.modOk).toBe(true)
    expect(viaTestv.allowed).toBe(true)
  })
})
