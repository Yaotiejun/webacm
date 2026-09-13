import type { Socket } from 'node:net'
import {
  assertCarveraSdUploadPath,
  buildCarveraXmodemChunks,
  md5Hex,
  sanitizeCarveraSdPath,
} from './sdPath.js'
import { sendXmodem, type XmodemSendProgress } from './xmodemSend.js'

export type CarveraUploadProgress = XmodemSendProgress & { path: string; md5?: string }

/**
 * Carve-control upload: `upload <path>` then XMODEM (md5 block + 8KB chunks).
 * Caller must put the TCP socket in raw (non-utf8) mode and pause status polling.
 */
export async function uploadCarveraSdFile(
  socket: Socket,
  rawPath: string,
  file: Buffer,
  opts: {
    delayMs?: number
    onProgress?: (p: CarveraUploadProgress) => void
  } = {},
): Promise<{ path: string; md5: string }> {
  const path = sanitizeCarveraSdPath(rawPath)
  assertCarveraSdUploadPath(path)
  const md5 = md5Hex(file)
  const chunks = buildCarveraXmodemChunks(file)
  const delayMs = opts.delayMs ?? 50

  socket.write(`upload ${path}\n`)
  await new Promise((r) => setTimeout(r, delayMs))

  await sendXmodem(socket, chunks, {
    onProgress: (p) => opts.onProgress?.({ ...p, path, md5 }),
  })

  return { path, md5 }
}

export function playCarveraSdFile(socket: Socket, rawPath: string): string {
  const path = sanitizeCarveraSdPath(rawPath)
  assertCarveraSdUploadPath(path)
  const line = `play ${path}`
  socket.write(`${line}\n`)
  return path
}
