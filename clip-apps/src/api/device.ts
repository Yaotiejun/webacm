import { CarveraConnection } from '@/core/devices/carvera'
import { GridBotConnection } from '@/core/devices/gridbot'

let carveraConn: CarveraConnection | null = null
let gridbotConn: GridBotConnection | null = null

export async function connectCarvera(endpoint: string) {
  if (!carveraConn) {
    carveraConn = new CarveraConnection({ endpoint })
  }
  await carveraConn.connect()
  return carveraConn
}

export function disconnectCarvera() {
  carveraConn?.disconnect()
  carveraConn = null
}

export function isCarveraConnected(): boolean {
  return carveraConn?.isOpen() ?? false
}

export function sendCarveraLine(line: string) {
  if (!carveraConn) throw new Error('carvera not connected')
  carveraConn.sendLine(line)
}

export function subscribeCarveraLines(handler: (line: string) => void) {
  if (!carveraConn) throw new Error('carvera not connected')
  return carveraConn.onLine(handler)
}

export function subscribeCarveraControl(
  handler: import('@/core/devices/carvera').CarveraControlHandler,
) {
  if (!carveraConn) throw new Error('carvera not connected')
  return carveraConn.onControl(handler)
}

export function sendCarveraBinary(bytes: ArrayBuffer | Uint8Array) {
  if (!carveraConn) throw new Error('carvera not connected')
  carveraConn.sendBinary(bytes)
}

export function sendCarveraControl(msg: Record<string, unknown>) {
  if (!carveraConn) throw new Error('carvera not connected')
  carveraConn.sendControl(msg)
}

/**
 * Upload G-code bytes to Carvera SD then optionally play.
 * Prefer binary frame + JSON control (carve-control style).
 */
export async function uploadCarveraSdAndMaybePlay(opts: {
  path: string
  content: string
  play?: boolean
  timeoutMs?: number
}): Promise<{ path: string; md5?: string }> {
  if (!carveraConn?.isOpen()) throw new Error('carvera not connected')
  const timeoutMs = opts.timeoutMs ?? 120_000
  const bytes = new TextEncoder().encode(opts.content)
  carveraConn.sendBinary(bytes)
  carveraConn.sendControl({
    type: opts.play ? 'upload-and-play' : 'upload',
    path: opts.path,
  })

  return new Promise((resolve, reject) => {
    let uploadedPath: string | undefined
    let uploadedMd5: string | undefined
    const t = setTimeout(() => {
      unsub()
      reject(new Error('SD upload timeout'))
    }, timeoutMs)

    const unsub = carveraConn!.onControl((ev) => {
      if (ev.type === 'error') {
        clearTimeout(t)
        unsub()
        reject(new Error(ev.message))
        return
      }
      if (ev.type === 'uploaded') {
        uploadedPath = ev.path
        uploadedMd5 = ev.md5
        if (!opts.play) {
          clearTimeout(t)
          unsub()
          resolve({ path: ev.path, md5: ev.md5 })
        }
        return
      }
      if (ev.type === 'played' && opts.play) {
        clearTimeout(t)
        unsub()
        resolve({ path: ev.path || uploadedPath || opts.path, md5: uploadedMd5 })
      }
    })
  })
}

export async function listCarveraSd(opts?: {
  path?: string
  timeoutMs?: number
}): Promise<{ path: string; dir: string[]; list: Array<{ name: string; size: string }> }> {
  if (!carveraConn?.isOpen()) throw new Error('carvera not connected')
  const timeoutMs = opts?.timeoutMs ?? 20_000
  carveraConn.sendControl({ type: 'sd-list', path: opts?.path ?? '/sd/gcodes' })
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      unsub()
      reject(new Error('SD list timeout'))
    }, timeoutMs)
    const unsub = carveraConn!.onControl((ev) => {
      if (ev.type === 'error') {
        clearTimeout(t)
        unsub()
        reject(new Error(ev.message))
        return
      }
      if (ev.type === 'sd-list') {
        clearTimeout(t)
        unsub()
        resolve({ path: ev.path, dir: ev.dir, list: ev.list })
      }
    })
  })
}

export async function removeCarveraSd(opts: {
  path: string
  timeoutMs?: number
}): Promise<{ path: string }> {
  if (!carveraConn?.isOpen()) throw new Error('carvera not connected')
  const timeoutMs = opts.timeoutMs ?? 15_000
  carveraConn.sendControl({ type: 'sd-rm', path: opts.path })
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      unsub()
      reject(new Error('SD remove timeout'))
    }, timeoutMs)
    const unsub = carveraConn!.onControl((ev) => {
      if (ev.type === 'error') {
        clearTimeout(t)
        unsub()
        reject(new Error(ev.message))
        return
      }
      if (ev.type === 'removed') {
        clearTimeout(t)
        unsub()
        resolve({ path: ev.path })
      }
    })
  })
}

export async function playCarveraSd(opts: {
  path: string
  timeoutMs?: number
}): Promise<{ path: string }> {
  if (!carveraConn?.isOpen()) throw new Error('carvera not connected')
  const timeoutMs = opts.timeoutMs ?? 15_000
  carveraConn.sendControl({ type: 'play', path: opts.path })
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      unsub()
      reject(new Error('SD play timeout'))
    }, timeoutMs)
    const unsub = carveraConn!.onControl((ev) => {
      if (ev.type === 'error') {
        clearTimeout(t)
        unsub()
        reject(new Error(ev.message))
        return
      }
      if (ev.type === 'played') {
        clearTimeout(t)
        unsub()
        resolve({ path: ev.path })
      }
    })
  })
}

export async function connectGridBot(endpoint: string) {
  if (!gridbotConn) {
    gridbotConn = new GridBotConnection({ endpoint })
  }
  await gridbotConn.connect()
  return gridbotConn
}

export function disconnectGridBot() {
  gridbotConn?.disconnect()
  gridbotConn = null
}

export function isGridBotConnected(): boolean {
  return gridbotConn?.isOpen() ?? false
}

export function sendGridBotLine(line: string) {
  if (!gridbotConn) throw new Error('gridbot not connected')
  gridbotConn.sendLine(line)
}

export function subscribeGridBotLines(handler: (line: string) => void) {
  if (!gridbotConn) throw new Error('gridbot not connected')
  gridbotConn.onLine(handler)
}
