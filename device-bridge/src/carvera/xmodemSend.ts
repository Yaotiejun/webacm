import { EventEmitter } from 'node:events'
import type { Socket } from 'node:net'
import { crc16xmodem } from './crc16.js'

const STX = 0x02
const EOT = 0x04
const ACK = 0x06
const NAK = 0x15
const CAN = 0x18
const FILL = 0x1a
const MCRC = 0x43 // 'C'
const NL = 0x0a

export type XmodemSendProgress = {
  block: number
  total: number
  phase: 'start' | 'progress' | 'end' | 'error'
  message?: string
}

/**
 * Carvera-flavored XMODEM send (8KB blocks, CRC, STX framing) — port of carve-control `lib/xmodem.js` send().
 */
export function sendXmodem(
  socket: Socket,
  chunks: Buffer[],
  opts: {
    blockSize?: number
    timeoutMs?: number
    onProgress?: (p: XmodemSendProgress) => void
  } = {},
): Promise<void> {
  const blockSize = opts.blockSize ?? 8192
  const timeoutMs = opts.timeoutMs ?? 30_000
  const onProgress = opts.onProgress

  return new Promise((resolve, reject) => {
    let blockNumber = 0
    let sentEof = false
    let settled = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      if (idleTimer) clearTimeout(idleTimer)
      socket.off('data', onData)
      if (err) {
        onProgress?.({ block: blockNumber, total: chunks.length, phase: 'error', message: err.message })
        reject(err)
      } else {
        onProgress?.({ block: blockNumber, total: chunks.length, phase: 'end' })
        resolve()
      }
    }

    const bumpIdle = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        try {
          socket.write(Buffer.from([CAN, CAN, CAN, NL]))
        } catch {
          // ignore
        }
        finish(new Error(`xmodem timeout after ${timeoutMs}ms @ block ${blockNumber}`))
      }, timeoutMs)
    }

    const sendBlock = (blockNr: number): boolean => {
      if (blockNr >= chunks.length) return false
      const dataBlock = chunks[blockNr]!
      const current = Buffer.alloc(blockSize + 2)
      current.fill(FILL)
      dataBlock.copy(current, 2)
      current[0] = (dataBlock.length >> 8) & 0xff
      current[1] = dataBlock.length & 0xff
      const dataCRC = crc16xmodem(current)
      const blockData = Buffer.concat([
        Buffer.from([STX, blockNr & 0xff, (255 - (blockNr & 0xff)) & 0xff]),
        current,
        Buffer.from([(dataCRC >> 8) & 0xff, dataCRC & 0xff]),
      ])
      socket.write(blockData)
      onProgress?.({
        block: blockNr,
        total: chunks.length,
        phase: blockNr === 0 ? 'start' : 'progress',
      })
      return true
    }

    const onData = (data: Buffer) => {
      bumpIdle()
      const b0 = data[0]
      const isStart = b0 === MCRC
      const isACK = b0 === ACK
      // Upstream checked data[1] for NAK (likely bug); accept either byte for robustness.
      const isNAK = b0 === NAK || data[1] === NAK

      if (isStart && blockNumber === 0) {
        sendBlock(0)
        return
      }
      if (isACK || isNAK) {
        if (sentEof) {
          finish()
          return
        }
        if (isACK) blockNumber += 1
        if (sendBlock(blockNumber)) return
        sentEof = true
        socket.write(Buffer.from([EOT]))
        return
      }
      try {
        socket.write(Buffer.from([CAN, CAN, CAN, NL]))
      } catch {
        // ignore
      }
      finish(new Error(`xmodem unexpected byte 0x${(b0 ?? 0).toString(16)} @ block ${blockNumber}`))
    }

    socket.on('data', onData)
    bumpIdle()
    onProgress?.({ block: 0, total: chunks.length, phase: 'start' })
  })
}

/** Tiny emitter helper for tests / mock backends. */
export class XmodemProgressBus extends EventEmitter {
  emitProgress(p: XmodemSendProgress) {
    this.emit('progress', p)
  }
}
