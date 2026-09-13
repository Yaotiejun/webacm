/**
 * Carvera SD directory listing — carve-control `ls -e -s <path>` until EOT (0x04).
 */
import type { Socket } from 'node:net'

export type CarveraSdListEntry = { name: string; size: string }

export type CarveraSdListResult = {
  dir: string[]
  list: CarveraSdListEntry[]
  path: string
}

/** Absolute path; reject /ud (firmware lockup). Strip trailing slash except root. */
export function normalizeCarveraListPath(raw?: string): string {
  let p = (raw ?? '/sd/gcodes').trim() || '/sd/gcodes'
  if (!p.startsWith('/')) p = `/${p}`
  if (p === '/ud' || p.toLowerCase().startsWith('/ud/') || p.toLowerCase() === '/ud') {
    throw new Error('ls /ud is forbidden (locks controller)')
  }
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '')
  return p || '/'
}

export function parseCarveraLsResponse(text: string): CarveraSdListEntry[] {
  const list: CarveraSdListEntry[] = []
  const cleaned = text.replace(/\x04/g, '')
  for (const line of cleaned.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const parts = t.split(/\s+/)
    const name = parts[0] ?? ''
    if (!name) continue
    if (name === 'ud/' || name.startsWith('ud/')) continue
    const size = parts.slice(1).join(' ') || ''
    list.push({ name, size })
  }
  return list
}

/** Heuristic matching carve-control web UI: name contains `/` after index 0 ⇒ directory. */
export function isCarveraSdDirEntry(name: string): boolean {
  return name.indexOf('/') > 0 || name.endsWith('/')
}

/**
 * Mock listing from an in-memory Map of absolute file paths.
 * Synthesizes sd/ and gcodes/ when browsing ancestors.
 */
export function mockListCarveraSd(
  sdFiles: Map<string, Buffer>,
  pathRaw?: string,
): CarveraSdListResult {
  const path = normalizeCarveraListPath(pathRaw)
  const dir = path === '/' ? [] : path.split('/').filter(Boolean)
  const list: CarveraSdListEntry[] = []

  if (path === '/') {
    list.push({ name: 'sd/', size: '' })
    return { path, dir, list }
  }
  if (path === '/sd') {
    list.push({ name: 'gcodes/', size: '' })
    return { path, dir, list }
  }

  const prefix = path.endsWith('/') ? path : `${path}/`
  const childDirs = new Set<string>()
  const files: CarveraSdListEntry[] = []

  for (const [filePath, buf] of sdFiles) {
    if (!filePath.startsWith(prefix) && filePath !== path) continue
    if (filePath === path) {
      files.push({ name: filePath.split('/').pop() || filePath, size: String(buf.length) })
      continue
    }
    const rest = filePath.slice(prefix.length)
    const slash = rest.indexOf('/')
    if (slash >= 0) {
      childDirs.add(`${rest.slice(0, slash)}/`)
    } else if (rest) {
      files.push({ name: rest, size: String(buf.length) })
    }
  }

  for (const d of [...childDirs].sort()) list.push({ name: d, size: '' })
  for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) list.push(f)
  return { path, dir, list }
}

export async function listCarveraSdDir(
  socket: Socket,
  pathRaw?: string,
  opts?: { timeoutMs?: number },
): Promise<CarveraSdListResult> {
  const path = normalizeCarveraListPath(pathRaw)
  const dir = path === '/' ? [] : path.split('/').filter(Boolean)
  const timeoutMs = opts?.timeoutMs ?? 15_000

  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0)
    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])
      if (buf.includes(0x04)) {
        cleanup()
        const text = buf.toString('utf8')
        resolve({ path, dir, list: parseCarveraLsResponse(text) })
      }
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`sd-list timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    const cleanup = () => {
      clearTimeout(timer)
      socket.off('data', onData)
    }
    socket.on('data', onData)
    try {
      socket.write(`ls -e -s ${path}\n`)
    } catch (e) {
      cleanup()
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

/** Delete only under /sd/gcodes/ (carve-control guard). */
export function assertCarveraSdRmPath(path: string): void {
  if (!path.startsWith('/sd/gcodes/') || path === '/sd/gcodes' || path === '/sd/gcodes/') {
    throw new Error(`rm refused: ${path} (must be a file under /sd/gcodes/)`)
  }
  if (path.includes('..')) throw new Error(`rm refused: ${path}`)
}

export function removeCarveraSdFile(socket: Socket, pathRaw: string): string {
  const path = normalizeCarveraListPath(pathRaw)
  assertCarveraSdRmPath(path)
  socket.write(`rm ${path}\n`)
  return path
}
