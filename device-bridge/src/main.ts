import { createServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import net from 'node:net'
import {
  createCarveraMockSession,
  createCarveraTcpSession,
  type CarveraBridgeEvent,
  type CarveraSession,
} from './carvera/session.js'

const PORT = Number(process.env.PORT ?? 9999)

function logError(err: unknown) {
  const e = err as NodeJS.ErrnoException
  if (e && e.code === 'EADDRINUSE') {
    console.error(`[device-bridge] 端口 ${PORT} 已被占用，请检查是否有旧的 device-bridge 或其他进程在监听该端口。`)
  }
  console.error('[device-bridge] server error', e)
}

const httpServer = createServer()
const carveraWss = new WebSocketServer({ noServer: true })
const gridbotWss = new WebSocketServer({ noServer: true })

httpServer.on('upgrade', (request, socket, head) => {
  const host = request.headers.host ?? `localhost:${PORT}`
  const pathname = new URL(request.url ?? '/', `http://${host}`).pathname
  if (pathname === '/carvera') {
    carveraWss.handleUpgrade(request, socket, head, (ws) => {
      carveraWss.emit('connection', ws, request)
    })
    return
  }
  if (pathname === '/gridbot') {
    gridbotWss.handleUpgrade(request, socket, head, (ws) => {
      gridbotWss.emit('connection', ws, request)
    })
    return
  }
  socket.destroy()
})

carveraWss.on('error', logError)
gridbotWss.on('error', logError)
httpServer.on('error', logError)

httpServer.listen(PORT, () => {
  console.log(`[device-bridge] ws://localhost:${PORT}/carvera`)
  console.log(`[device-bridge] ws://localhost:${PORT}/gridbot`)
})

process.on('uncaughtException', (err) => {
  console.error('[device-bridge] uncaughtException', err)
})

process.on('unhandledRejection', (err) => {
  console.error('[device-bridge] unhandledRejection', err)
})

async function shutdown(signal: string) {
  console.log(`[device-bridge] shutting down (${signal})...`)
  await Promise.all([
    new Promise<void>((resolve) => carveraWss.close(() => resolve())),
    new Promise<void>((resolve) => gridbotWss.close(() => resolve())),
    new Promise<void>((resolve) => httpServer.close(() => resolve())),
  ])
  console.log('[device-bridge] shutdown complete')
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

let nextCarveraId = 1
let nextGridbotId = 1

type CarveraConnStats = {
  id: number
  prefix: string
  enqueued: number
  acked: number
  dropped: number
  maxQueueLen: number
  backend: 'mock' | 'tcp'
  tcpConnected: boolean
  uploads: number
}

type GridbotConnStats = {
  id: number
  prefix: string
  commands: number
  m114: number
  tempSets: number
  backend: 'mock' | 'tcp'
  tcpConnected: boolean
}

interface LineBackend {
  onClientLine(line: string): void
  dispose(): void
}

function parseTcpTarget(envVar: string | undefined): { host: string; port: number } | null {
  if (!envVar) return null
  const [host, portStr] = envVar.split(':')
  const port = Number(portStr)
  if (!host || !Number.isFinite(port)) return null
  return { host, port }
}

function createTcpLineBackend(
  prefix: string,
  target: { host: string; port: number },
  send: (line: string) => void,
  onState?: (connected: boolean) => void,
): LineBackend {
  const socket = net.createConnection(target.port, target.host)

  socket.setEncoding('utf8')

  socket.on('connect', () => {
    console.log(`${prefix} tcp connected`, target)
    onState?.(true)
    send(`[bridge] tcp connected ${target.host}:${target.port}`)
  })

  socket.on('data', (chunk: string) => {
    const text = chunk
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      send(line)
    }
  })

  socket.on('error', (err) => {
    console.error(`${prefix} tcp error`, err)
    send(`[bridge] tcp error: ${String(err)}`)
  })

  socket.on('close', () => {
    console.log(`${prefix} tcp closed`)
    onState?.(false)
    send('[bridge] tcp closed')
  })

  return {
    onClientLine(line: string) {
      if (!line) return
      try {
        socket.write(`${line}\n`)
      } catch (e) {
        console.error(`${prefix} tcp write error`, e)
      }
    },
    dispose() {
      try {
        socket.end()
      } catch {
        // ignore
      }
    },
  }
}

const carveraConns = new Map<number, CarveraConnStats>()
const gridbotConns = new Map<number, GridbotConnStats>()

function logStats() {
  const carveraSummary = Array.from(carveraConns.values()).map((s) =>
    `${s.prefix} backend=${s.backend} tcp=${s.tcpConnected} q=${s.maxQueueLen} enq=${s.enqueued} ack=${s.acked} drop=${s.dropped} up=${s.uploads}`,
  )
  const gridbotSummary = Array.from(gridbotConns.values()).map((s) =>
    `${s.prefix} backend=${s.backend} tcp=${s.tcpConnected} cmds=${s.commands} m114=${s.m114} tempSets=${s.tempSets}`,
  )
  console.log('[device-bridge] stats', {
    carvera: carveraSummary,
    gridbot: gridbotSummary,
  })
}

setInterval(logStats, 10_000)

function sendCarveraEvent(ws: WebSocket, ev: CarveraBridgeEvent | string) {
  if (typeof ev === 'string') {
    ws.send(`${ev}\n`)
    return
  }
  if (ev.type === 'line') {
    ws.send(`${ev.line}\n`)
    return
  }
  ws.send(`${JSON.stringify(ev)}\n`)
}

function parseGridbotLineNo(line: string): number | null {
  const m = line.match(/^N(\d+)\b/)
  return m ? Number(m[1]) : null
}

/** Strip leading `N###` line number prefix before matching G/M commands. */
function gridbotCommandBody(line: string): string {
  return line.replace(/^N\d+\s+/, '')
}

function formatGridbotAdvancedOk(lineNo: number | null, bufFree: number, plnFree: number): string {
  const n = lineNo != null ? ` N${lineNo}` : ''
  return `ok${n} B${bufFree} P${plnFree}`
}

function createGridbotMockBackend(prefix: string, stats: GridbotConnStats, send: (line: string) => void): LineBackend {
  let t = 0
  let nozzleTarget = 210
  let bedTarget = 60
  let bufFree = 16
  let plnFree = 16
  let pos = { x: 0, y: 0, z: 0, e: 0 }
  let absolute = true
  let mockResendOnce = process.env.GRIDBOT_MOCK_RESEND === '1'
  let resendFired = false

  const timer = setInterval(() => {
    t += 1
    const nozzle = Math.min(nozzleTarget, 200 + Math.sin(t / 20) * 5)
    const bed = Math.min(bedTarget, 60)

    try {
      send(
        `ok T:${nozzle.toFixed(1)} /${nozzleTarget.toFixed(1)} B:${bed.toFixed(1)} /${bedTarget.toFixed(1)}`,
      )
      send(
        `X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)} E:${pos.e.toFixed(2)}`,
      )
    } catch {
      // ignore
    }
  }, 1500)

  function applyMove(body: string) {
    const axisRe = /([XYZE])\s*(-?\d+(?:\.\d+)?)/gi
    let m: RegExpExecArray | null
    while ((m = axisRe.exec(body))) {
      const axis = m[1]!.toUpperCase() as 'X' | 'Y' | 'Z' | 'E'
      const v = Number(m[2])
      if (!Number.isFinite(v)) continue
      const key = axis.toLowerCase() as 'x' | 'y' | 'z' | 'e'
      pos[key] = absolute ? v : pos[key] + v
    }
  }

  return {
    onClientLine(line: string) {
      if (!line) return
      stats.commands += 1
      console.log(`${prefix} in`, line)

      const m104 = line.match(/M104\s+S(\d+(?:\.\d+)?)/i)
      if (m104) {
        nozzleTarget = Number(m104[1])
        stats.tempSets += 1
      }
      const m140 = line.match(/M140\s+S(\d+(?:\.\d+)?)/i)
      if (m140) {
        bedTarget = Number(m140[1])
        stats.tempSets += 1
      }

      try {
        const body = gridbotCommandBody(line)

        if (/^G90\b/i.test(body)) {
          absolute = true
          send('ok')
          return
        }
        if (/^G91\b/i.test(body)) {
          absolute = false
          send('ok')
          return
        }
        if (/^G0\b|^G1\b|^G28\b/i.test(body)) {
          if (/^G28\b/i.test(body)) {
            pos = { x: 0, y: 0, z: 0, e: pos.e }
          } else {
            applyMove(body)
          }
        }

        if (/^M114\b/i.test(body)) {
          stats.m114 += 1
          send(
            `X:${pos.x.toFixed(2)} Y:${pos.y.toFixed(2)} Z:${pos.z.toFixed(2)} E:${pos.e.toFixed(2)}`,
          )
          send('ok')
          return
        }

        if (/^M105\b/i.test(body)) {
          send(
            `ok T:${nozzleTarget.toFixed(1)} /${nozzleTarget.toFixed(1)} B:${bedTarget.toFixed(1)} /${bedTarget.toFixed(1)}`,
          )
          return
        }

        if (mockResendOnce && !resendFired && /^N\d+/i.test(line.trim())) {
          resendFired = true
          send('Resend: 1')
          send('ok')
          return
        }

        if (/^G\d|^M\d/i.test(body)) {
          const lineNo = parseGridbotLineNo(line)
          bufFree = Math.max(1, bufFree - 1)
          plnFree = Math.max(1, plnFree - 1)
          send(formatGridbotAdvancedOk(lineNo, bufFree, plnFree))
          return
        }

        send('ok')
      } catch {
        // ignore
      }
    },
    dispose() {
      clearInterval(timer)
    },
  }
}

carveraWss.on('connection', (ws, req) => {
  const id = nextCarveraId++
  const prefix = `[carvera#${id}]`
  console.log(`${prefix} connected`, { url: req.url })

  const stats: CarveraConnStats = {
    id,
    prefix,
    enqueued: 0,
    acked: 0,
    dropped: 0,
    maxQueueLen: 0,
    backend: 'mock',
    tcpConnected: false,
    uploads: 0,
  }
  carveraConns.set(id, stats)

  const carveraBackendKind = process.env.CARVERA_BACKEND ?? 'mock'
  const carveraTcpTarget = parseTcpTarget(process.env.CARVERA_TCP)

  const sendEv = (ev: CarveraBridgeEvent | string) => {
    try {
      if (typeof ev !== 'string' && ev.type === 'uploaded') stats.uploads += 1
      if (typeof ev !== 'string' && ev.type === 'line' && ev.line === 'ok') stats.acked += 1
      sendCarveraEvent(ws, ev)
    } catch {
      // ignore
    }
  }

  const session: CarveraSession =
    carveraBackendKind === 'tcp' && carveraTcpTarget
      ? (() => {
          stats.backend = 'tcp'
          stats.tcpConnected = true
          return createCarveraTcpSession(prefix, carveraTcpTarget, sendEv)
        })()
      : (() => {
          stats.backend = 'mock'
          return createCarveraMockSession(prefix, sendEv)
        })()

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
      session.onClientBinary(buf)
      return
    }
    const text = typeof data === 'string' ? data : Buffer.from(data as Buffer).toString('utf8')
    stats.enqueued += 1
    session.onClientText(text)
  })

  ws.on('close', () => {
    session.dispose()
    carveraConns.delete(id)
    console.log(`${prefix} disconnected`)
  })
})

gridbotWss.on('connection', (ws, req) => {
  const id = nextGridbotId++
  const prefix = `[gridbot#${id}]`
  console.log(`${prefix} connected`, { url: req.url })

  const stats: GridbotConnStats = {
    id,
    prefix,
    commands: 0,
    m114: 0,
    tempSets: 0,
    backend: 'mock',
    tcpConnected: false,
  }
  gridbotConns.set(id, stats)

  const gridbotBackendKind = process.env.GRIDBOT_BACKEND ?? 'mock'
  const gridbotTcpTarget = parseTcpTarget(process.env.GRIDBOT_TCP)

  const backend: LineBackend =
    gridbotBackendKind === 'tcp' && gridbotTcpTarget
      ? (() => {
          stats.backend = 'tcp'
          return createTcpLineBackend(prefix, gridbotTcpTarget, (line) => {
            ws.send(`${line}\n`)
          }, (connected) => {
            stats.tcpConnected = connected
          })
        })()
      : (() => {
          stats.backend = 'mock'
          return createGridbotMockBackend(prefix, stats, (line) => {
            ws.send(`${line}\n`)
          })
        })()

  ws.on('message', (data) => {
    const text = typeof data === 'string' ? data : data.toString('utf8')
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      backend.onClientLine(line)
    }
  })

  ws.on('close', () => {
    backend.dispose()
    gridbotConns.delete(id)
    console.log(`${prefix} disconnected`)
  })
})
