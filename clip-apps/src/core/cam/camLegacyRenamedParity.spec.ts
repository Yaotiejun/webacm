import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LEGACY_CAM_PROCESS_FIELD_ALIASES } from './camJobSummaryBridge'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Parse grip `legacy/kiri/core/conf.js` **`const renamed = { … };`** (`key: "canon"` lines only). */
function loadKiriConfRenamedProcessMap(): Record<string, string> {
  const confPath = join(__dirname, 'legacy/kiri/core/conf.js')
  const src = readFileSync(confPath, 'utf8')
  const marker = 'const renamed = {'
  const start = src.indexOf(marker)
  if (start < 0) throw new Error(`"${marker}" not found in conf.js`)
  const open = src.indexOf('{', start)
  let depth = 0
  let end = -1
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end < 0) throw new Error('unclosed renamed object in conf.js')
  const body = src.slice(open + 1, end)
  const out: Record<string, string> = {}
  const lineRe = /^\s*(\w+)\s*:\s*"([^"]*)"/gm
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(body)) !== null) {
    out[m[1]] = m[2]
  }
  if (Object.keys(out).length < 10) {
    throw new Error(`parsed too few renamed entries from conf.js (${Object.keys(out).length})`)
  }
  return out
}

/** Keys merged in TS bridge but absent from kiri `renamed` (device JSON typos, etc.). */
const EXTRA_LEGACY_ALIASES = new Set(['cmaPocketOutline', 'cmaPocketRefine'])

describe('cam.legacyRenamedParity (grip conf.js vs clip-apps bridge)', () => {
  it('LEGACY_CAM_PROCESS_FIELD_ALIASES matches conf.js renamed map entry-for-entry', () => {
    const kiri = loadKiriConfRenamedProcessMap()
    for (const [legacy, canon] of Object.entries(kiri)) {
      expect(LEGACY_CAM_PROCESS_FIELD_ALIASES[legacy as keyof typeof LEGACY_CAM_PROCESS_FIELD_ALIASES]).toBe(
        canon,
      )
    }
  })

  it('allows only known extra aliases beyond kiri conf.js renamed', () => {
    const kiriKeys = new Set(Object.keys(loadKiriConfRenamedProcessMap()))
    for (const k of Object.keys(LEGACY_CAM_PROCESS_FIELD_ALIASES)) {
      expect(kiriKeys.has(k) || EXTRA_LEGACY_ALIASES.has(k)).toBe(true)
    }
    expect(Object.keys(LEGACY_CAM_PROCESS_FIELD_ALIASES).length).toBe(
      kiriKeys.size + EXTRA_LEGACY_ALIASES.size,
    )
  })
})
