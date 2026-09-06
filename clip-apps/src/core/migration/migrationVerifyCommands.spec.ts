import { describe, expect, it } from 'vitest'
import { formatMigrationVerifyChecklist, MIGRATION_VERIFY_COMMANDS } from './migrationVerifyCommands'

describe('migrationVerifyCommands', () => {
  it('lists gate and sync commands', () => {
    expect(MIGRATION_VERIFY_COMMANDS.gate).toContain('migration:verify')
    expect(formatMigrationVerifyChecklist()).toContain('sync:grip-fixtures')
    expect(MIGRATION_VERIFY_COMMANDS.syncAndVerify).toContain('sync:verify')
  })
})
