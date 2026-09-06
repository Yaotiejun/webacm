import { deviceBridgeCarveraUrl, deviceBridgeGridBotUrl } from '@/core/migration/deviceBridgeManifest'
import { parseDeviceBridgeTcpEndpoint, parseDeviceBridgeTcpState } from '@/core/migration/deviceBridgeBackendModes'
import { defaultCarveraBridgeEndpoint, defaultGridBotBridgeEndpoint } from '@/core/migration/deviceBridgeDefaultEndpoint'
import { formatGripLogTimestamp } from '@/core/migration/gripLogFormat'
import { gripNetLevelClone } from '@/core/migration/gripNetLevelClone'
import { gripNetLevelHash } from '@/core/migration/gripNetLevelHash'
import { GripNetLevelLineBuffer } from '@/core/migration/gripNetLevelLineBuffer'
import { GripNetLevelPiper } from '@/core/migration/gripNetLevelPiper'
import { gripNetLevelSafeParse } from '@/core/migration/gripNetLevelSafeParse'
import { netLevelDecodeLine, netLevelEncodeLine } from '@/core/migration/netLevelLineCodec'
import { isGripAppServerLocalIp } from '@/core/migration/gripAppServerLocal'
import {
  gripAppServerRedirectHeaders,
  gripAppServerRemoteIpFromRequest,
} from '@/core/migration/gripAppServerHttp'
import { GripAppServerRequestTracker } from '@/core/migration/gripAppServerRequestTracker'
import {
  createGripMemoryStaticRoot,
  GripAppServerStaticRouter,
  matchGripAppHost,
  matchGripAppSyncRoute,
  stripGripStaticPrefix,
} from '@/core/migration/gripAppServerStaticRoute'
import { MIGRATION_VITE_FLAGS, formatMigrationEnvHint } from '@/core/migration/migrationEnvManifest'
import { MIGRATION_SYNC_COMMANDS } from '@/core/migration/migrationSyncCommands'
import { createGripAppServerRequestContext } from '@/core/migration/gripAppServerRequestContext'
import { evaluateGripAppModuleGate } from '@/core/migration/gripAppServerModuleGate'
import { accumulateGripPostBody, isGripPostMethod } from '@/core/migration/gripAppServerPostBody'
import { GripAppServerSlowRequestWatcher } from '@/core/migration/gripAppServerSlowRequest'
import { evaluateOtherMigrationComplete } from '@/core/migration/otherMigrationComplete'
import {
  gripCompressionMiddlewareHeaders,
  shouldGripCompressResponse,
} from '@/core/migration/gripAppServerCompression'
import { GripAppServerWssRegistry } from '@/core/migration/gripAppServerWssRegistry'
import {
  gripAppJsonToModuleMeta,
  parseGripAppJsonModule,
} from '@/core/migration/gripAppServerAppJson'
import { evaluateCarveraProductionSoak } from '@/core/devices/carveraProductionSoak'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from '@/core/migration/deviceBridgeCarveraMockStatus'
import { evaluateGridbotProductionSoak } from '@/core/devices/gridbotProductionSoak'
import {
  DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE,
} from '@/core/migration/deviceBridgeGridbotMockStatus'

export interface BackendMigrationCompleteResult {
  ok: boolean
  checks: Record<string, boolean>
  errors: string[]
}

/** Migration gate: shared backend utilities + device-bridge contracts. */
export function evaluateBackendMigrationComplete(): BackendMigrationCompleteResult {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  checks.netLevelCodec =
    netLevelDecodeLine(netLevelEncodeLine({ ping: 1 }))?.ping === 1
  if (!checks.netLevelCodec) errors.push('net-level line codec failed')

  checks.netLevelHash = gripNetLevelHash('test').length === 128
  if (!checks.netLevelHash) errors.push('net-level hash failed')

  checks.netLevelClone = gripNetLevelClone({ a: [1] }).a[0] === 1
  if (!checks.netLevelClone) errors.push('net-level clone failed')

  checks.safeParse = gripNetLevelSafeParse('{"x":1}')?.x === 1
  if (!checks.safeParse) errors.push('safeParse failed')

  const lines: string[] = []
  const buf = new GripNetLevelLineBuffer((l) => lines.push(l))
  buf.onData('{"a":1}\n')
  checks.lineBuffer = lines[0] === '{"a":1}'
  if (!checks.lineBuffer) errors.push('LineBuffer failed')

  const a = new GripNetLevelPiper('a')
  const b = new GripNetLevelPiper('b')
  a.pipe(b)
  let piped = ''
  b.on('readable', () => {
    let c: string | undefined
    while ((c = b.read()) !== undefined) piped += c
  })
  a.write('x')
  checks.piper = piped === 'x'
  if (!checks.piper) errors.push('Piper failed')

  checks.logFormat = formatGripLogTimestamp(new Date(2026, 0, 1, 0, 0, 0)) === '260101.000000'
  if (!checks.logFormat) errors.push('grip log format failed')

  checks.localIp = isGripAppServerLocalIp('127.0.0.1')
  if (!checks.localIp) errors.push('app-server local IP failed')

  checks.bridgeUrls =
    deviceBridgeCarveraUrl().endsWith('/carvera') &&
    deviceBridgeGridBotUrl().endsWith('/gridbot') &&
    defaultCarveraBridgeEndpoint().includes('/carvera')
  if (!checks.bridgeUrls) errors.push('device-bridge URLs failed')

  checks.tcpParse =
    parseDeviceBridgeTcpState('[bridge] tcp connected 10.0.0.1:3001') === 'connected' &&
    parseDeviceBridgeTcpEndpoint('[bridge] tcp connected 10.0.0.1:3001') === '10.0.0.1:3001'
  if (!checks.tcpParse) errors.push('device-bridge TCP parse failed')

  const carveraMock = evaluateCarveraProductionSoak(
    Array.from({ length: 10 }, (_, i) => ({
      line: DEVICE_BRIDGE_CARVERA_MOCK_STATUS,
      parsed: null,
      at: i,
    })),
  )
  checks.carveraMock = carveraMock.ok
  if (!checks.carveraMock) errors.push(`carvera mock soak: ${carveraMock.errors.join('; ')}`)

  const gridbotMock = evaluateGridbotProductionSoak([
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE, at: 0 },
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE, at: 1 },
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK, at: 2 },
    { line: 'ok B14 P15', at: 3 },
  ])
  checks.gridbotMock = gridbotMock.ok
  if (!checks.gridbotMock) errors.push(`gridbot mock soak: ${gridbotMock.errors.join('; ')}`)

  checks.httpRedirect = gripAppServerRedirectHeaders('/app').statusCode === 307
  if (!checks.httpRedirect) errors.push('app-server redirect failed')

  checks.remoteIp =
    gripAppServerRemoteIpFromRequest({
      headers: { 'x-forwarded-for': '127.0.0.1, 198.51.100.4' },
    }) === '198.51.100.4'
  if (!checks.remoteIp) errors.push('app-server remoteIP failed')

  const tracker = new GripAppServerRequestTracker()
  const done = tracker.openRequest()
  done()
  checks.requestTracker = tracker.snapshot().completedRequests === 1
  if (!checks.requestTracker) errors.push('app-server request tracker failed')

  checks.migrationEnv = formatMigrationEnvHint().includes(MIGRATION_VITE_FLAGS.KIRI_LEGACY_CAM)
  if (!checks.migrationEnv) errors.push('migration env hint failed')

  checks.syncCommands = Object.keys(MIGRATION_SYNC_COMMANDS).length >= 4
  if (!checks.syncCommands) errors.push('migration sync commands manifest failed')

  const stripped = stripGripStaticPrefix('/demo/app.js', '/demo')
  checks.staticPrefixStrip = stripped.matched && stripped.rewritten === '/app.js'
  if (!checks.staticPrefixStrip) errors.push('static prefix strip failed')

  checks.staticHost = matchGripAppHost('localhost:9999', ['*'])
  if (!checks.staticHost) errors.push('static host match failed')

  const ctx = createGripAppServerRequestContext('/health?ok=true')
  checks.requestContext =
    ctx.pathname === '/health' &&
    ctx.getBoolean('ok') === true &&
    matchGripAppSyncRoute(ctx, 'GET', 'GET', '/health')
  if (!checks.requestContext) errors.push('request context stub failed')

  const staticRouter = new GripAppServerStaticRouter()
  staticRouter.registerModule({
    name: 'shape_cam_stub',
    meta: {
      host: ['localhost:9999'],
      static: { '/clip': 'dist' },
    },
    roots: {
      dist: createGripMemoryStaticRoot({
        '/index.html': '<!doctype html><title>shape_cam</title>',
      }),
    },
  })
  const staticRes = staticRouter.handle({
    method: 'GET',
    url: '/clip/index.html',
    host: 'localhost:9999',
  })
  checks.staticRouter =
    staticRes?.statusCode === 200 && staticRes.body.includes('shape_cam')
  if (!checks.staticRouter) errors.push('app-server static route stub failed')

  const headRes = staticRouter.handle({
    method: 'HEAD',
    url: '/clip/index.html',
    host: 'localhost:9999',
  })
  checks.staticHead = headRes?.statusCode === 200 && headRes.body === ''
  if (!checks.staticHead) errors.push('static HEAD failed')

  const secureOnly = new GripAppServerStaticRouter()
  secureOnly.registerModule({
    name: 'secure_stub',
    meta: {
      host: ['*'],
      secure: true,
      static: { '/s': 'dist' },
    },
    roots: {
      dist: createGripMemoryStaticRoot({ '/x.html': 'secure' }),
    },
  })
  checks.staticSecure =
    secureOnly.handle({
      method: 'GET',
      url: '/s/x.html',
      host: 'localhost',
      secure: false,
    })?.statusCode === 404 &&
    secureOnly.handle({
      method: 'GET',
      url: '/s/x.html',
      host: 'localhost',
      secure: true,
    })?.statusCode === 200
  if (!checks.staticSecure) errors.push('static meta.secure gate failed')

  const modGate = evaluateGripAppModuleGate({
    host: 'localhost',
    allowedHosts: ['*'],
    metaSecure: true,
    requestSecure: true,
  })
  checks.moduleGate = modGate.allowed
  if (!checks.moduleGate) errors.push('app-server module gate failed')

  checks.decodePost =
    isGripPostMethod('POST') && accumulateGripPostBody(['a', 'b']) === 'ab'
  if (!checks.decodePost) errors.push('decodePost stub failed')

  const slowWatcher = new GripAppServerSlowRequestWatcher()
  const slowId = slowWatcher.track('/health', 0)
  checks.slowRequest = slowWatcher.tick(6000).includes('/health')
  slowWatcher.close(slowId)
  if (!checks.slowRequest) errors.push('slow request watcher failed')

  const other = evaluateOtherMigrationComplete()
  checks.otherScoped = other.ok
  if (!checks.otherScoped) errors.push(`other scope: ${other.errors.join('; ')}`)

  checks.compression =
    shouldGripCompressResponse('gzip, deflate') &&
    gripCompressionMiddlewareHeaders(true)['Content-Encoding'] === 'gzip'
  if (!checks.compression) errors.push('compression stub failed')

  const wss = new GripAppServerWssRegistry()
  let wssHit = false
  wss.register('/ping', () => {
    wssHit = true
  })
  checks.wssRegistry = wss.dispatch('/ping', null) && wssHit
  if (!checks.wssRegistry) errors.push('app-server wss registry stub failed')

  const appJson = parseGripAppJsonModule({
    name: 'shape_cam',
    host: ['localhost:9999'],
    static: { '/clip': 'dist' },
    secure: false,
  })
  const meta = appJson ? gripAppJsonToModuleMeta(appJson) : null
  checks.appJson = meta?.static?.['/clip'] === 'dist' && meta.host?.[0] === 'localhost:9999'
  if (!checks.appJson) errors.push('app.json parse stub failed')

  return {
    ok: errors.length === 0,
    checks,
    errors,
  }
}
