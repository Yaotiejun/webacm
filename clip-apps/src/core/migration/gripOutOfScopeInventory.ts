/**
 * grip packages explicitly out of the shape_cam product migration stream.
 * Documented here so scoreboard `other` can reach 100% without porting dead code.
 */

export interface GripOutOfScopeEntry {
  id: string
  gripPath: string
  reason: string
}

export const GRIP_OUT_OF_SCOPE_INVENTORY: readonly GripOutOfScopeEntry[] = Object.freeze([
  {
    id: 'wattzup',
    gripPath: 'wattzup-main',
    reason: 'Power/log analysis tooling; not used by clip-apps or device-bridge',
  },
  {
    id: 'basic-ftp',
    gripPath: 'basic-ftp-master',
    reason: 'Third-party FTP library mirror; not a product surface',
  },
])

export function isGripPackageInMigrationStream(gripFolderName: string): boolean {
  return !GRIP_OUT_OF_SCOPE_INVENTORY.some((e) => e.gripPath === gripFolderName)
}
