/**
 * Resolve grip monorepo root (sibling of shapexcam) for Vite alias + sync scripts.
 * Prefer GRIP_ROOT env, then ../../grip, then ../../Kiri-Moto (this workspace layout).
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipAppsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const githubRoot = path.resolve(clipAppsRoot, '../..')

/**
 * @param {string} packageName e.g. 'raster-path-main'
 * @param {string} [subPath] e.g. 'src/core'
 * @returns {string | null} absolute path if found
 */
export function resolveGripPackagePath(packageName, subPath = '') {
  const envRoot = process.env.GRIP_ROOT?.trim()
  const candidates = [
    envRoot ? path.join(envRoot, packageName) : null,
    path.join(githubRoot, 'grip', packageName),
    path.join(githubRoot, 'Kiri-Moto', packageName),
    path.join(githubRoot, 'chip', 'grip', packageName),
  ].filter(Boolean)

  for (const base of candidates) {
    const full = subPath ? path.join(base, subPath) : base
    if (existsSync(full)) return full
  }
  return null
}

export function resolveGripRasterCore() {
  return resolveGripPackagePath('raster-path-main', 'src/core')
}

export { clipAppsRoot, githubRoot }
