/** Format grip `cam_export` section list for CAM result panels. */
export function formatCamExportSectionsList(sections: readonly string[]): string {
  if (!sections.length) return 'camExport.sections=(none)'
  return `camExport.sections=${sections.join(', ')}`
}

/** Expected section sequence for migration synthetic fixture. */
export const GRIP_CAM_FIXTURE_SECTIONS = Object.freeze([
  'header',
  'op-0-rough',
  'footer',
] as const)
