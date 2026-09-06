/** npm scripts that sync grip assets into clip-apps (migration DX). */
export const MIGRATION_SYNC_COMMANDS = Object.freeze({
  rasterFixtures: 'npm run sync:grip-fixtures',
  carveraAssets: 'npm run sync:grip-carvera-assets',
  wasm: 'npm run sync:grip-wasm',
  all: 'npm run sync:grip-all',
  verify: 'npm run sync:verify',
} as const)

export function formatMigrationSyncChecklist(): string {
  return [
    'Grip asset sync:',
    `  ${MIGRATION_SYNC_COMMANDS.all}`,
    `  then ${MIGRATION_SYNC_COMMANDS.verify}`,
  ].join('\n')
}
