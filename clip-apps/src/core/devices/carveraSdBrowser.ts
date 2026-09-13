/** Client-side helpers for Carvera SD browser (carve-control heuristics). */

export type CarveraSdEntry = { name: string; size: string }

export function isCarveraSdDirName(name: string): boolean {
  return name.indexOf('/') > 0 || name.endsWith('/')
}

export function joinCarveraSdPath(currentPath: string, entryName: string): string {
  const base = currentPath === '/' ? '' : currentPath.replace(/\/+$/, '')
  const child = entryName.replace(/\/+$/, '')
  return `${base}/${child}`.replace(/\/+/g, '/') || '/'
}

export function parentCarveraSdPath(currentPath: string): string {
  if (!currentPath || currentPath === '/') return '/'
  const parts = currentPath.replace(/\/+$/, '').split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}` : '/'
}

export function formatCarveraSdBreadcrumb(dir: string[]): string {
  return dir.length ? `/${dir.join('/')}` : '/'
}
