/** Parsed request URL like grip `app-server` `setup()`. */
export interface GripAppServerRequestContext {
  pathname: string
  query: Record<string, string>
  params: URLSearchParams
  secure: boolean
  getBoolean: (key: string) => boolean | undefined
}

export function createGripAppServerRequestContext(
  url: string,
  opts: { secure?: boolean } = {},
): GripAppServerRequestContext {
  const parsed = new URL(url, 'http://localhost')
  const query: Record<string, string> = {}
  parsed.searchParams.forEach((v, k) => {
    query[k] = v
  })
  const params = new URLSearchParams(parsed.search)
  return {
    pathname: parsed.pathname || '/',
    query,
    params,
    secure: opts.secure === true,
    getBoolean: (key: string) => {
      const value = params.get(key)
      if (value === 'true') return true
      if (value === 'false') return false
      return undefined
    },
  }
}
