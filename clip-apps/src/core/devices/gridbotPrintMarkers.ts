/** grip `server.js` `write()` — `M117 Start` marks transition from prep to print body. */
export function isGridbotM117StartLine(line: string): boolean {
  return line.trim().startsWith('M117 Start')
}
