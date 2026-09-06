/** grip `app-server` localhost allowlist (`ipLocal`). */
export const GRIP_APP_SERVER_LOCAL_IPS = Object.freeze([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
] as const)

export function isGripAppServerLocalIp(ip: string | undefined | null): boolean {
  if (!ip) return false
  return (GRIP_APP_SERVER_LOCAL_IPS as readonly string[]).includes(ip.trim())
}

/** grip `noCache` response headers. */
export function gripAppServerNoCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, must-revalidate',
    Expires: '0',
  }
}
