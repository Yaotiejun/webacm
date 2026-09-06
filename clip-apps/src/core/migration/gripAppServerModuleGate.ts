import { matchGripAppHost } from '@/core/migration/gripAppServerStaticRoute'

/** grip `updateApp` handler: host + `meta.secure` + optional `test` / `testv`. */
export interface GripAppModuleGateInput {
  host: string | undefined
  allowedHosts: readonly string[]
  metaSecure?: boolean
  requestSecure: boolean
  referer?: string
  test?: (req: unknown) => boolean
  testv?: (refQuery: string | undefined) => boolean
}

export interface GripAppModuleGateResult {
  hostOk: boolean
  secOk: boolean
  modOk: boolean
  allowed: boolean
}

export function evaluateGripAppModuleGate(input: GripAppModuleGateInput): GripAppModuleGateResult {
  const hostOk = matchGripAppHost(input.host, input.allowedHosts)
  const secOk =
    input.metaSecure === undefined || input.metaSecure === (input.requestSecure === true)
  const refq = input.referer?.split('?')[1]
  const modOk =
    input.test == null
      ? true
      : input.test({}) === true || (input.testv != null && input.testv(refq) === true)
  return {
    hostOk,
    secOk,
    modOk,
    allowed: hostOk && secOk && modOk,
  }
}
