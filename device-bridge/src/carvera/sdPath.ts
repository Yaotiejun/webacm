import { createHash } from 'node:crypto'

/** Carvera SD gcodes root — firmware rejects other roots for job upload. */
export const CARVERA_SD_GCODES_ROOT = '/sd/gcodes/'

export function sanitizeCarveraSdPath(raw: string): string {
  let path = String(raw || '').trim().replace(/ /g, '_')
  if (!path.startsWith(CARVERA_SD_GCODES_ROOT)) {
    const name = path.split(/[/\\]/).pop() || 'job.nc'
    path = `${CARVERA_SD_GCODES_ROOT}${name.replace(/ /g, '_')}`
  }
  return path
}

export function assertCarveraSdUploadPath(path: string): void {
  if (!path.startsWith(CARVERA_SD_GCODES_ROOT)) {
    throw new Error(`invalid upload path: ${path} (must start with ${CARVERA_SD_GCODES_ROOT})`)
  }
}

export function md5Hex(buffer: Buffer): string {
  return createHash('md5').update(buffer).digest('hex')
}

/** Build XMODEM chunks: block0 = md5 hex string, then 8KB file slices (carve-control). */
export function buildCarveraXmodemChunks(file: Buffer, blockSize = 8192): Buffer[] {
  const md5sum = md5Hex(file)
  const chunks: Buffer[] = [Buffer.from(md5sum, 'utf8')]
  for (let i = 0; i < file.length; i += blockSize) {
    chunks.push(file.subarray(i, Math.min(file.length, i + blockSize)))
  }
  return chunks
}
