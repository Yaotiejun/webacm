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
  carveraConn.onLine(handler)
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
