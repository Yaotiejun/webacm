import net, { type Socket } from 'node:net'
import {
  assertCarveraSdUploadPath,
  sanitizeCarveraSdPath,
} from './sdPath.js'
import { playCarveraSdFile, uploadCarveraSdFile } from './upload.js'
import {
  assertCarveraSdRmPath,
  listCarveraSdDir,
  mockListCarveraSd,
  normalizeCarveraListPath,
  removeCarveraSdFile,
  type CarveraSdListEntry,
} from './list.js'

export type CarveraBridgeEvent =
  | { type: 'line'; line: string }
  | {
      type: 'xmodem'
      phase: 'start' | 'progress' | 'end' | 'error'
      block?: number
      total?: number
      path?: string
      message?: string
    }
  | { type: 'uploaded'; path: string; md5: string }
  | { type: 'played'; path: string }
  | { type: 'sd-list'; path: string; dir: string[]; list: CarveraSdListEntry[] }
  | { type: 'removed'; path: string }
  | { type: 'error'; message: string }

export type CarveraSessionSend = (ev: CarveraBridgeEvent | string) => void

export interface CarveraSession {
  onClientText(text: string): void
  onClientBinary(buf: Buffer): void
  dispose(): void
  readonly xmitting: boolean
}

function emitLine(send: CarveraSessionSend, line: string) {
  send({ type: 'line', line })
}

function emitJson(send: CarveraSessionSend, ev: Exclude<CarveraBridgeEvent, { type: 'line' }>) {
  send(ev)
}

function parseControlMessage(trimmed: string): {
  type?: string
  path?: string
  dataBase64?: string
} | null {
  if (!trimmed.startsWith('{')) return null
  try {
    return JSON.parse(trimmed) as { type?: string; path?: string; dataBase64?: string }
  } catch {
    return null
  }
}

/** Mock: fake XMODEM progress then store file in memory; play emits |P: status. */
export function createCarveraMockSession(
  prefix: string,
  send: CarveraSessionSend,
): CarveraSession {
  const sdFiles = new Map<string, Buffer>()
  let pendingBinary: Buffer | null = null
  let xmitting = false
  let playTimer: ReturnType<typeof setInterval> | null = null
  let t = 0
  let alarmed = false

  emitLine(send, "Grbl 1.1h ['$' for help]")

  const posTimer = setInterval(() => {
    if (xmitting) return
    t += 1
    const x = (Math.sin(t / 10) * 10).toFixed(3)
    const y = (Math.cos(t / 10) * 10).toFixed(3)
    const z = (Math.sin(t / 25) * 2).toFixed(3)
    emitLine(send, `X${x} Y${y} Z${z}`)
  }, 200)

  async function handleUpload(pathRaw: string, file: Buffer) {
    if (xmitting) {
      emitJson(send, { type: 'error', message: 'cannot upload: busy xmit' })
      return
    }
    const path = sanitizeCarveraSdPath(pathRaw)
    try {
      assertCarveraSdUploadPath(path)
    } catch (e) {
      emitJson(send, { type: 'error', message: (e as Error).message })
      return
    }
    xmitting = true
    const total = Math.max(1, Math.ceil(file.length / 8192) + 1)
    const { md5Hex, buildCarveraXmodemChunks } = await import('./sdPath.js')
    const chunks = buildCarveraXmodemChunks(file)
    const md5 = md5Hex(file)
    emitJson(send, { type: 'xmodem', phase: 'start', block: 0, total: chunks.length || total, path })
    for (let i = 0; i < chunks.length; i++) {
      await new Promise((r) => setTimeout(r, 5))
      emitJson(send, {
        type: 'xmodem',
        phase: i === chunks.length - 1 ? 'end' : 'progress',
        block: i,
        total: chunks.length,
        path,
      })
    }
    sdFiles.set(path, file)
    xmitting = false
    emitJson(send, { type: 'uploaded', path, md5 })
    console.log(`${prefix} mock uploaded`, path, file.length)
  }

  function handlePlay(pathRaw: string) {
    const path = sanitizeCarveraSdPath(pathRaw)
    if (!sdFiles.has(path)) {
      console.log(`${prefix} mock play (no prior upload)`, path)
    }
    emitJson(send, { type: 'played', path })
    if (playTimer) clearInterval(playTimer)
    let pct = 0
    let line = 0
    playTimer = setInterval(() => {
      pct = Math.min(100, pct + 8)
      line += 12
      emitLine(
        send,
        `<Run|MPos:1.000,2.000,0.500|WPos:1.000,2.000,0.500|FS:1000,0,100|P:${line},${pct.toFixed(1)},${Math.floor(pct)}|A:0|H:0|Buf:10>`,
      )
      if (pct >= 100) {
        if (playTimer) clearInterval(playTimer)
        playTimer = null
        emitLine(send, '<Idle|MPos:1.000,2.000,0.500|P:0,100,0|Buf:15>')
      }
    }, 80)
  }

  function onGcodeLine(line: string) {
    if (xmitting) return
    const cmd = line.trim()
    if (!cmd) return
    if (/^(\$|\?)\S+/i.test(cmd)) {
      emitLine(send, 'error:2')
      return
    }
    if (!alarmed && /\$H\b/i.test(cmd)) {
      alarmed = true
      emitLine(send, 'ALARM:9')
      return
    }
    if (cmd === '?' || cmd.toLowerCase() === 'status') {
      emitLine(
        send,
        '<Idle|MPos:0.000,0.000,0.000|WPos:0.000,0.000,0.000|FS:0,0,100|S:0,10000,100,0|L:0,255,100,0|W:3.300|P:0,0,0|A:0|H:0|Buf:15>',
      )
      emitLine(send, 'ok')
      return
    }
    if (/^play\s+/i.test(cmd)) {
      handlePlay(cmd.replace(/^play\s+/i, '').trim())
      emitLine(send, 'ok')
      return
    }
    emitLine(send, 'ok')
  }

  async function dispatchControl(msg: { type?: string; path?: string; dataBase64?: string }) {
    if (msg.type === 'sd-list' || msg.type === 'ls') {
      try {
        const result = mockListCarveraSd(sdFiles, msg.path)
        emitJson(send, {
          type: 'sd-list',
          path: result.path,
          dir: result.dir,
          list: result.list,
        })
      } catch (e) {
        emitJson(send, { type: 'error', message: (e as Error).message })
      }
      return
    }
    if (msg.type === 'sd-rm' || msg.type === 'rm') {
      try {
        const path = normalizeCarveraListPath(msg.path)
        assertCarveraSdRmPath(path)
        sdFiles.delete(path)
        emitJson(send, { type: 'removed', path })
      } catch (e) {
        emitJson(send, { type: 'error', message: (e as Error).message })
      }
      return
    }
    if (msg.type === 'upload' || msg.type === 'sd-upload') {
      const file =
        msg.dataBase64 != null ? Buffer.from(msg.dataBase64, 'base64') : pendingBinary
      pendingBinary = null
      if (!file?.length) {
        emitJson(send, { type: 'error', message: 'upload missing file bytes' })
        return
      }
      await handleUpload(msg.path || '/sd/gcodes/job.nc', file)
      return
    }
    if (msg.type === 'play' || msg.type === 'sd-play') {
      handlePlay(msg.path || '/sd/gcodes/job.nc')
      return
    }
    if (msg.type === 'upload-and-play') {
      const file =
        msg.dataBase64 != null ? Buffer.from(msg.dataBase64, 'base64') : pendingBinary
      pendingBinary = null
      if (!file?.length) {
        emitJson(send, { type: 'error', message: 'upload-and-play missing file bytes' })
        return
      }
      const path = msg.path || '/sd/gcodes/job.nc'
      await handleUpload(path, file)
      handlePlay(path)
    }
  }

  return {
    get xmitting() {
      return xmitting
    },
    onClientBinary(buf: Buffer) {
      pendingBinary = buf
    },
    onClientText(text: string) {
      const trimmed = text.trim()
      if (!trimmed) return
      const msg = parseControlMessage(trimmed)
      if (msg?.type) {
        void dispatchControl(msg)
        return
      }
      for (const line of trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
        onGcodeLine(line)
      }
    },
    dispose() {
      clearInterval(posTimer)
      if (playTimer) clearInterval(playTimer)
    },
  }
}

export function createCarveraTcpSession(
  prefix: string,
  target: { host: string; port: number },
  send: CarveraSessionSend,
): CarveraSession {
  let pendingBinary: Buffer | null = null
  let xmitting = false
  let lineBuf = ''

  const socket = net.createConnection(target.port, target.host)

  const onLineData = (chunk: Buffer) => {
    if (xmitting) return
    lineBuf += chunk.toString('utf8')
    const parts = lineBuf.split(/\r?\n/)
    lineBuf = parts.pop() ?? ''
    for (const line of parts) {
      const t = line.trim()
      if (t) emitLine(send, t)
    }
  }

  socket.on('connect', () => {
    console.log(`${prefix} tcp connected`, target)
    emitLine(send, `[bridge] tcp connected ${target.host}:${target.port}`)
  })
  socket.on('data', onLineData)
  socket.on('error', (err) => {
    console.error(`${prefix} tcp error`, err)
    emitLine(send, `[bridge] tcp error: ${String(err)}`)
  })
  socket.on('close', () => {
    console.log(`${prefix} tcp closed`)
    emitLine(send, '[bridge] tcp closed')
  })

  async function handleUpload(pathRaw: string, file: Buffer) {
    if (socket.destroyed) {
      emitJson(send, { type: 'error', message: 'tcp not connected' })
      return
    }
    if (xmitting) {
      emitJson(send, { type: 'error', message: 'cannot upload: busy xmit' })
      return
    }
    xmitting = true
    socket.off('data', onLineData)
    try {
      const result = await uploadCarveraSdFile(socket, pathRaw, file, {
        onProgress: (p) =>
          emitJson(send, {
            type: 'xmodem',
            phase: p.phase,
            block: p.block,
            total: p.total,
            path: p.path,
            message: p.message,
          }),
      })
      emitJson(send, { type: 'uploaded', path: result.path, md5: result.md5 })
    } catch (e) {
      emitJson(send, { type: 'error', message: (e as Error).message })
    } finally {
      xmitting = false
      socket.on('data', onLineData)
    }
  }

  function handlePlay(pathRaw: string) {
    if (socket.destroyed) {
      emitJson(send, { type: 'error', message: 'tcp not connected' })
      return
    }
    try {
      const path = playCarveraSdFile(socket, pathRaw)
      emitJson(send, { type: 'played', path })
    } catch (e) {
      emitJson(send, { type: 'error', message: (e as Error).message })
    }
  }

  async function handleList(pathRaw?: string) {
    if (socket.destroyed) {
      emitJson(send, { type: 'error', message: 'tcp not connected' })
      return
    }
    if (xmitting) {
      emitJson(send, { type: 'error', message: 'cannot list: busy xmit' })
      return
    }
    xmitting = true
    socket.off('data', onLineData)
    try {
      const result = await listCarveraSdDir(socket, pathRaw)
      emitJson(send, {
        type: 'sd-list',
        path: result.path,
        dir: result.dir,
        list: result.list,
      })
    } catch (e) {
      emitJson(send, { type: 'error', message: (e as Error).message })
    } finally {
      xmitting = false
      socket.on('data', onLineData)
    }
  }

  function handleRm(pathRaw?: string) {
    if (socket.destroyed) {
      emitJson(send, { type: 'error', message: 'tcp not connected' })
      return
    }
    try {
      const path = removeCarveraSdFile(socket, pathRaw || '')
      emitJson(send, { type: 'removed', path })
    } catch (e) {
      emitJson(send, { type: 'error', message: (e as Error).message })
    }
  }

  async function dispatchControl(msg: { type?: string; path?: string; dataBase64?: string }) {
    if (msg.type === 'sd-list' || msg.type === 'ls') {
      await handleList(msg.path)
      return
    }
    if (msg.type === 'sd-rm' || msg.type === 'rm') {
      handleRm(msg.path)
      return
    }
    if (msg.type === 'upload' || msg.type === 'sd-upload') {
      const file =
        msg.dataBase64 != null ? Buffer.from(msg.dataBase64, 'base64') : pendingBinary
      pendingBinary = null
      if (!file?.length) {
        emitJson(send, { type: 'error', message: 'upload missing file bytes' })
        return
      }
      await handleUpload(msg.path || '/sd/gcodes/job.nc', file)
      return
    }
    if (msg.type === 'play' || msg.type === 'sd-play') {
      handlePlay(msg.path || '/sd/gcodes/job.nc')
      return
    }
    if (msg.type === 'upload-and-play') {
      const file =
        msg.dataBase64 != null ? Buffer.from(msg.dataBase64, 'base64') : pendingBinary
      pendingBinary = null
      if (!file?.length) {
        emitJson(send, { type: 'error', message: 'upload-and-play missing file bytes' })
        return
      }
      const path = msg.path || '/sd/gcodes/job.nc'
      await handleUpload(path, file)
      handlePlay(path)
    }
  }

  return {
    get xmitting() {
      return xmitting
    },
    onClientBinary(buf: Buffer) {
      pendingBinary = buf
    },
    onClientText(text: string) {
      const trimmed = text.trim()
      if (!trimmed) return
      const msg = parseControlMessage(trimmed)
      if (msg?.type) {
        void dispatchControl(msg)
        return
      }
      if (xmitting || socket.destroyed) return
      for (const line of trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
        try {
          socket.write(`${line}\n`)
        } catch (e) {
          console.error(`${prefix} tcp write error`, e)
        }
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
