/** CRC-16/XMODEM (poly 0x1021, init 0). */
export function crc16xmodem(buf: Buffer | Uint8Array): number {
  let crc = 0
  for (let i = 0; i < buf.length; i++) {
    crc ^= (buf[i]! << 8)
    for (let b = 0; b < 8; b++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff
      else crc = (crc << 1) & 0xffff
    }
  }
  return crc
}
