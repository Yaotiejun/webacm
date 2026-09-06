export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(filename: string, text: string, mime = 'application/json;charset=utf-8') {
  downloadBlob(filename, new Blob([text], { type: mime }))
}
