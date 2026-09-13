/**
 * Bridge: active path is slaEngine.ts (sla-ts-mvp).
 * Vendored Kiri mode/sla work: ./legacy/work/
 */
export { runSlaFromMesh } from '@/core/sla/slaEngine'
export const SLA_LEGACY_INIT = 'src/core/sla/legacy/work/init-work.js'
/** Product jobs go through submitSlaJob (Worker); engine/fallback remains ts-mvp. */
export const SLA_BACKEND = 'sla-worker' as const
