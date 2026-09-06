/** Mirror device-bridge `parseTcpTarget` (`host:port` env vars). */
export function parseGripTcpTarget(envValue: string | undefined): { host: string; port: number } | null {
  if (!envValue?.trim()) return null
  const [host, portStr] = envValue.trim().split(':')
  const port = Number(portStr)
  if (!host || !Number.isFinite(port)) return null
  return { host, port }
}

export function formatGripTcpTarget(host: string, port: number): string {
  return `${host}:${port}`
}
