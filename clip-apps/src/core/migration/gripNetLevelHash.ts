import { createHash } from 'node:crypto'

/** grip `net-level` `util.hash` — SHA-512 hex digest of string input. */
export function gripNetLevelHash(input: string | Buffer): string {
  return createHash('sha512').update(input).digest('hex')
}
