export interface FdmMaterial {
  name: string

  // temps
  nozzleTemp: number
  bedTemp: number

  // fan
  fanSpeed: number
  fanLayer: number

  // flow & retract
  flowMult: number
  retractDist: number
  retractSpeed: number
}

export interface MaterialSummary {
  name: string
  mode: 'FDM'
  isLocal: boolean
}
