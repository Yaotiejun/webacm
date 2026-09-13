// Carvera device connection — line stream + SD upload/play control events

export interface CarveraConnectionOptions {
  endpoint: string
}

export type CarveraLineHandler = (line: string) => void

export type CarveraControlEvent =
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
  | {
      type: 'sd-list'
      path: string
      dir: string[]
      list: Array<{ name: string; size: string }>
    }
  | { type: 'removed'; path: string }
  | { type: 'error'; message: string }

export type CarveraControlHandler = (ev: CarveraControlEvent) => void

function tryParseControl(line: string): CarveraControlEvent | null {
  const t = line.trim()
  if (!t.startsWith('{')) return null
  try {
    const msg = JSON.parse(t) as CarveraControlEvent
    if (
      msg &&
      (msg.type === 'xmodem' ||
        msg.type === 'uploaded' ||
        msg.type === 'played' ||
        msg.type === 'sd-list' ||
        msg.type === 'removed' ||
        msg.type === 'error')
    ) {
      return msg
    }
  } catch {
    // not control JSON
  }
  return null
}

export class CarveraConnection {
  private socket: WebSocket | null = null
  private lineHandlers: CarveraLineHandler[] = []
  private controlHandlers: CarveraControlHandler[] = []

  constructor(private readonly options: CarveraConnectionOptions) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      try {
        const socket = new WebSocket(this.options.endpoint)
        this.socket = socket

        socket.addEventListener('open', () => {
          resolve()
        })

        socket.addEventListener('message', (ev) => {
          if (typeof ev.data !== 'string') return
          const lines = ev.data.split(/\r?\n/).filter((l) => l.trim().length > 0)
          for (const line of lines) {
            const control = tryParseControl(line)
            if (control) {
              for (const h of this.controlHandlers) h(control)
              continue
            }
            for (const handler of this.lineHandlers) {
              handler(line)
            }
          }
        })

        socket.addEventListener('error', () => {
          reject(new Error('Carvera WebSocket error'))
        })

        socket.addEventListener('close', () => {
          this.socket = null
        })
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.close()
      } catch {
        // ignore
      }
      this.socket = null
    }
  }

  isOpen(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN
  }

  sendLine(line: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Carvera socket not open')
    }
    this.socket.send(line + '\n')
  }

  /** Send raw file bytes (pending), then JSON upload/play control. */
  sendBinary(bytes: ArrayBuffer | Uint8Array) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Carvera socket not open')
    }
    const buf =
      bytes instanceof ArrayBuffer
        ? bytes
        : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    this.socket.send(buf)
  }

  sendControl(msg: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Carvera socket not open')
    }
    this.socket.send(`${JSON.stringify(msg)}\n`)
  }

  onLine(handler: CarveraLineHandler) {
    this.lineHandlers.push(handler)
    return () => {
      this.lineHandlers = this.lineHandlers.filter((h) => h !== handler)
    }
  }

  onControl(handler: CarveraControlHandler) {
    this.controlHandlers.push(handler)
    return () => {
      this.controlHandlers = this.controlHandlers.filter((h) => h !== handler)
    }
  }
}
