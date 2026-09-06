/** grip `Connect().use(Compression())` — gzip when client accepts it. */
export function shouldGripCompressResponse(acceptEncoding: string | undefined): boolean {
  if (!acceptEncoding) return false
  const parts = acceptEncoding
    .toLowerCase()
    .split(',')
    .map((s) => s.trim().split(';')[0]!)
  return parts.includes('gzip') || parts.includes('deflate') || parts.includes('br')
}

export function gripCompressionMiddlewareHeaders(enabled: boolean): Record<string, string> {
  if (!enabled) return {}
  return { 'Content-Encoding': 'gzip' }
}
