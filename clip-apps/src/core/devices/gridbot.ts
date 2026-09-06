// Minimal GridBot device connection wrapper (Phase 5 skeleton)

export interface GridBotConnectionOptions {
  endpoint: string
}

export type GridBotLineHandler = (line: string) => void

export class GridBotConnection {
  private socket: WebSocket | null = null
  private lineHandlers: GridBotLineHandler[] = []

  constructor(private readonly options: GridBotConnectionOptions) {}

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
          const lines = data.split(/\r?\n/).filter((l) => l.trim().length > 0)
          for (const line of lines) {
            for (const handler of this.lineHandlers) {
              handler(line)
            }
          }
        })

        socket.addEventListener('error', () => {
          reject(new Error('GridBot WebSocket error'))
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
      throw new Error('GridBot socket not open')
    }
    this.socket.send(line + '\n')
  }

  onLine(handler: GridBotLineHandler) {
    this.lineHandlers.push(handler)
  }
}
