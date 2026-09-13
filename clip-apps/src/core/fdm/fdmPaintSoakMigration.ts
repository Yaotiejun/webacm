/**
 * FDM paint soak gate - registers 90s legacy integration as soak entry.
 * Fast gate remains in migrationProductGates; this is the deep soak.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export type FdmPaintSoakMigrationResult = {
  ok: boolean
  checks: {
    integrationSpecPresent: boolean
    fastGatePresent: boolean
    soakScriptDocumented: boolean
  }
  errors: string[]
  note: string
}

export function evaluateFdmPaintSoakMigration(): FdmPaintSoakMigrationResult {
  const errors: string[] = []
  const root = process.cwd()
  const integrationSpecPresent = existsSync(
    resolve(root, "src/core/slicer/fdmSupportPaint.integration.spec.ts"),
  )
  const fastGatePresent = existsSync(
    resolve(root, "src/core/fdm/fdmSupportPaintMigrationComplete.ts"),
  )
  let soakScriptDocumented = false
  try {
    const text = readFileSync(resolve(root, "package.json"), "utf8")
    soakScriptDocumented = text.includes("soak:fdm:paint") && text.includes("test:fdm:support-paint")
  } catch {
    soakScriptDocumented = false
  }

  if (!integrationSpecPresent) errors.push("fdmSupportPaint.integration.spec.ts missing")
  if (!fastGatePresent) errors.push("fdmSupportPaintMigrationComplete.ts missing")
  if (!soakScriptDocumented) errors.push("package.json missing soak:fdm:paint / test:fdm:support-paint")

  return {
    ok: errors.length === 0,
    checks: { integrationSpecPresent, fastGatePresent, soakScriptDocumented },
    errors,
    note: "Run npm run soak:fdm:paint for 90s legacy paint slice (not in soak:offline).",
  }
}
