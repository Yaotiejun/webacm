import { isGripAppServerLocalIp } from '@/core/migration/gripAppServerLocal'

/** grip `app-server` HTTP redirect (default 307). */
export function gripAppServerRedirectHeaders(
  location: string,
  statusCode: 301 | 302 | 307 | 308 = 307,
): { statusCode: number; headers: Record<string, string> } {
  return {
    statusCode,
    headers: { Location: location },
  }
}

/** grip `reply404` body. */
export const GRIP_APP_SERVER_404_BODY = '[404]'

export function formatGripAppServer404LogFields(req: {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  remoteAddress?: string
}): string[] {
  const h = req.headers ?? {}
  const origin = Array.isArray(h.origin) ? h.origin[0] : h.origin
  const ua = Array.isArray(h['user-agent']) ? h['user-agent'][0] : h['user-agent']
  return [
    '404',
    req.method ?? '',
    String(h.host ?? ''),
    req.url ?? '',
    req.remoteAddress ?? '',
    origin ?? '',
    ua ?? '',
  ]
}

/**
 * grip `remoteIP` — prefer first non-local forwarded / socket address.
 */
export function resolveGripAppServerClientIp(addrs: readonly (string | undefined)[]): string | null {
  const cleaned = addrs
    .map((addr) => {
      if (!addr || isGripAppServerLocalIp(addr)) return null
      const trimmed = addr.trim()
      if (trimmed.startsWith('::ffff:')) return trimmed.slice(7)
      if (trimmed.includes(':') && trimmed.includes('.')) {
        return trimmed.split(':').slice(0, 4).join(':')
      }
      return trimmed
    })
    .filter((a): a is string => a != null)

  cleaned.sort((a, b) => {
    const ia = a.includes(':') ? 0 : 1
    const ib = b.includes(':') ? 0 : 1
    return ia - ib
  })
  return cleaned[0] ?? null
}

export function gripAppServerRemoteIpFromRequest(req: {
  headers?: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
  connection?: { remoteAddress?: string }
}): string | null {
  const fwd = (req.headers?.['x-forwarded-for'] ?? '')
    .toString()
    .split(',')
    .map((s) => s.trim())
  return resolveGripAppServerClientIp([
    ...fwd,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress,
  ])
}
