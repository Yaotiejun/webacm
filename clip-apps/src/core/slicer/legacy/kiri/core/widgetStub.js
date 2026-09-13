/** Minimal widget factory for FDM prepare support synthesis (avoids full grip widget.js). */
export function newWidget(id, group) {
  const wid = {
    id: id || `w-${Date.now().toString(36)}`,
    group: group || [],
    track: {
      synth: true,
      support: true,
      ignore: false,
      zcut: 0,
      box: { w: 0, h: 0 },
      pos: { x: 0, y: 0 },
      grid_id: 0,
    },
    meta: { disabled: false },
    anno: { extruder: 0 },
    mesh: null,
    slices: [],
    support: undefined,
    offset: undefined,
    belt: undefined,
    bounds: null,
    getBoundingBox() {
      return this.bounds
    },
    getPoints() {
      return []
    },
    clearSlices() {
      this.slices = []
    },
    setTopZ() {},
  }
  if (!Array.isArray(wid.group)) wid.group = []
  if (!wid.group.includes(wid)) wid.group.push(wid)
  return wid
}
