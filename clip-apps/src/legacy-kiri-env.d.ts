// Minimal ambient declarations for legacy Kiri JS and worker env

// Allow importing plain JS modules under core/slicer/legacy without typings
declare module '@/core/slicer/legacy/*' {
  const mod: any
  export = mod
}

declare module './core/slicer/legacy/*' {
  const mod: any
  export = mod
}

// Allow importing plain JS modules under core/cam/legacy without typings
declare module '@/core/cam/legacy/*' {
  const mod: any
  export = mod
}

declare module './legacy/geo/slicer.js' {
  const mod: any
  export = mod
}

declare module './legacy/kiri/core/slice.js' {
  const mod: any
  export = mod
}

// Worker globals (keep it loose for PoC)
declare const self: any
