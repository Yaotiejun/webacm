// Minimal Carvera device connection wrapper (Phase 5 skeleton)

export interface CarveraConnectionOptions {
  endpoint: string
}

export type CarveraLineHandler = (line: string) => void

export class CarveraConnection {
  private socket: WebSocket | null = null
  private lineHandlers: CarveraLineHandler[] = []

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
          const data = typeof ev.data === 'string' ? ev.data : ''
          if (!data) return
          // assume line-based protocol
          const lines = data.split(/\r?\n/).filter((l) => l.trim().length > 0)
          for (const line of lines) {
            for (const handler of this.lineHandlers) {
              handler(line)
            }
          }
        })

        socket.addEventListener('error', (ev) => {
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

  onLine(handler: CarveraLineHandler) {
    this.lineHandlers.push(handler)
  }
}
