import {
  GRIP_OUT_OF_SCOPE_INVENTORY,
  isGripPackageInMigrationStream,
} from '@/core/migration/gripOutOfScopeInventory'

export interface OtherMigrationCompleteResult {
  ok: boolean
  checks: Record<string, boolean>
  errors: string[]
}

/** Migration gate: non-product grip domains scoped out with inventory contract. */
export function evaluateOtherMigrationComplete(): OtherMigrationCompleteResult {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  checks.inventoryNonEmpty = GRIP_OUT_OF_SCOPE_INVENTORY.length >= 2
  if (!checks.inventoryNonEmpty) errors.push('out-of-scope inventory empty')

  checks.wattzupScoped =
    GRIP_OUT_OF_SCOPE_INVENTORY.some((e) => e.id === 'wattzup') &&
    !isGripPackageInMigrationStream('wattzup-main')
  if (!checks.wattzupScoped) errors.push('wattzup not scoped out')

  checks.basicFtpScoped =
    GRIP_OUT_OF_SCOPE_INVENTORY.some((e) => e.id === 'basic-ftp') &&
    !isGripPackageInMigrationStream('basic-ftp-master')
  if (!checks.basicFtpScoped) errors.push('basic-ftp not scoped out')

  checks.productPathsInStream =
    isGripPackageInMigrationStream('grid-apps-master') &&
    isGripPackageInMigrationStream('raster-path-main') &&
    isGripPackageInMigrationStream('stlTexturizer-main')
  if (!checks.productPathsInStream) errors.push('primary grip packages misclassified')

  return { ok: errors.length === 0, checks, errors }
}
