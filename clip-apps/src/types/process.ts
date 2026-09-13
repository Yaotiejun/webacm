export interface FdmProcess {
  processName: string

  // temps
  outputTemp: number
  outputBedTemp: number
  firstLayerNozzleTemp: number
  firstLayerBedTemp: number

  // speeds
  outputFeedrate: number
  outputSeekrate: number
  firstLayerRate: number

  // layers
  sliceHeight: number
  firstSliceHeight: number
  sliceTopLayers: number
  sliceBottomLayers: number
  sliceShells: number
  sliceLineWidth: number
  sliceAdaptive?: boolean
  sliceMinHeight?: number

  // infill (Kiri LISTS.infill parity)
  sliceFillSparse: number
  sliceFillType: 'none' | 'grid' | 'linear' | 'hex' | 'triangle' | 'gyroid' | 'vase'
  sliceFillOverlap: number

  // support (minimal subset)
  sliceSupportEnable: boolean
  sliceSupportDensity: number
  sliceSupportOffset: number
  sliceSupportSize: number
  sliceSupportAngle: number
  // advanced support
  sliceSupportZGap?: number
  sliceSupportXYExpand?: number
  sliceSupportInterfaceLayers?: number
  sliceSupportOutlineOnly?: boolean
  /** Multi-extruder: which nozzle prints supports (Kiri sliceSupportNozzle). */
  sliceSupportNozzle?: number
  /**
   * Support generation mode (Kiri sliceSupportType).
   * `manual` uses widget.anno.paint spheres; `automatic` uses overhang projection.
   */
  sliceSupportType?: 'automatic' | 'manual' | 'disabled'
  /** Purge tower size (mm² area side derived via sqrt); 0 = off (Kiri outputPurgeTower). */
  outputPurgeTower?: number

  // brim / raft
  enableBrim?: boolean
  brimCount?: number
  brimOffset?: number
  enableRaft?: boolean
  raftSpacing?: number

  // walls / thin / compensation
  sliceDetectThin?: number
  sliceCompInner?: number
  sliceCompOuter?: number

  // extrusion multipliers
  outputShellMult?: number
  outputFillMult?: number
  outputSparseMult?: number

  // retract
  outputRetractDist: number
  outputRetractSpeed: number

  // cooling
  outputFanSpeed: number
  outputFanLayer: number

  // misc
  outputMinLayerTime: number
  zHopDistance: number

  // belt (CR-30 style; only used when device.bedBelt)
  sliceAngle?: number
  beltAnchor?: number
  firstLayerBeltLead?: number
  firstLayerBeltBump?: number
  firstLayerBeltFact?: number
  firstLayerYOffset?: number

  // ranges (layer overrides)
  ranges?: FdmProcessRange[]
}

export interface FdmProcessRange {
  fromLayer: number
  toLayer: number
  sliceHeight?: number
  outputTemp?: number
  outputFeedrate?: number
  outputFanSpeed?: number
  outputRetractDist?: number
}

export interface ProcessSummary {
  name: string
  mode: 'FDM'
  isLocal: boolean
}
