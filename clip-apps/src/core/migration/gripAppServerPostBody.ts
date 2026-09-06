/** grip `decodePost` — concatenate POST chunks into `req.app.post`. */
export function accumulateGripPostBody(chunks: readonly string[]): string {
  return chunks.join('')
}

export function isGripPostMethod(method: string): boolean {
  return method.toUpperCase() === 'POST'
}
