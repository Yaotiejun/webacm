export interface JsonExportArtifact {
  filename: string
  json: string
}

export function createTimestampedJsonFilename(prefix: string, now = new Date()): string {
  return `${prefix}-${now.toISOString().replace(/[:.]/g, '-')}.json`
}

export function createJsonExportArtifact(prefix: string, payload: unknown, now = new Date()): JsonExportArtifact {
  return {
    filename: createTimestampedJsonFilename(prefix, now),
    json: JSON.stringify(payload, null, 2),
  }
}
