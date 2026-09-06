import type { GripAppModuleMeta } from '@/core/migration/gripAppServerStaticRoute'

export interface GripAppJsonModule {
  name?: string
  main?: string
  host?: string | string[]
  static?: Record<string, string>
  secure?: boolean
}

/** Parse grip `app.json` module descriptor (subset used by app-server). */
export function parseGripAppJsonModule(raw: unknown): GripAppJsonModule | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const host =
    typeof o.host === 'string'
      ? o.host
      : Array.isArray(o.host)
        ? o.host.filter((h): h is string => typeof h === 'string')
        : undefined
  const staticMeta =
    o.static && typeof o.static === 'object' && !Array.isArray(o.static)
      ? Object.fromEntries(
          Object.entries(o.static as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'string',
          ),
        )
      : undefined
  return {
    name: typeof o.name === 'string' ? o.name : undefined,
    main: typeof o.main === 'string' ? o.main : undefined,
    host,
    static: staticMeta,
    secure: typeof o.secure === 'boolean' ? o.secure : undefined,
  }
}

export function gripAppJsonToModuleMeta(mod: GripAppJsonModule): GripAppModuleMeta {
  const hosts = mod.host == null ? undefined : Array.isArray(mod.host) ? mod.host : [mod.host]
  return {
    host: hosts,
    static: mod.static,
    secure: mod.secure,
  }
}
