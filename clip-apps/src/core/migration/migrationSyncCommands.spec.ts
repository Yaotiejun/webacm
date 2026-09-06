import { describe, expect, it } from 'vitest'
import { MIGRATION_SYNC_COMMANDS, formatMigrationSyncChecklist } from './migrationSyncCommands'

describe('migrationSyncCommands', () => {
  it('lists sync scripts', () => {
    expect(MIGRATION_SYNC_COMMANDS.all).toContain('sync:grip-all')
    expect(formatMigrationSyncChecklist()).toContain('sync:verify')
  })
})
