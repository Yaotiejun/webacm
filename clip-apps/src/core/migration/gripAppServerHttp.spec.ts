import { describe, expect, it } from 'vitest'
import {
  formatGripAppServer404LogFields,
  gripAppServerRedirectHeaders,
  gripAppServerRemoteIpFromRequest,
  GRIP_APP_SERVER_404_BODY,
  resolveGripAppServerClientIp,
} from './gripAppServerHttp'

describe('gripAppServerHttp', () => {
  it('builds redirect and 404 log fields like grip app-server', () => {
    const redir = gripAppServerRedirectHeaders('/login')
    expect(redir.statusCode).toBe(307)
    expect(redir.headers.Location).toBe('/login')
    expect(GRIP_APP_SERVER_404_BODY).toBe('[404]')
    const fields = formatGripAppServer404LogFields({
      method: 'GET',
      url: '/missing',
      headers: { host: 'localhost', origin: 'http://x' },
      remoteAddress: '10.0.0.5',
    })
    expect(fields[0]).toBe('404')
    expect(fields[3]).toBe('/missing')
  })

  it('resolves client IP skipping localhost', () => {
    expect(resolveGripAppServerClientIp(['127.0.0.1', '10.1.2.3'])).toBe('10.1.2.3')
    expect(
      gripAppServerRemoteIpFromRequest({
        headers: { 'x-forwarded-for': '127.0.0.1, 203.0.113.8' },
        socket: { remoteAddress: '::ffff:127.0.0.1' },
      }),
    ).toBe('203.0.113.8')
  })
})
