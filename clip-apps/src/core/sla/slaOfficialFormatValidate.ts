/**
 * Offline CTB AES / GOO validation + optional ChiTuBox/Elegoo reference compare.
 *
 * Env:
 *   SLA_OFFICIAL_CTB_PATH / SLA_OFFICIAL_GOO_PATH - reference files
 *   SLA_OFFICIAL_REQUIRE=1 - fail when paths unset
 *   SLA_OFFICIAL_STRICT=1 - require magic match (no soft GOO)
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CTB_ENCRYPTED_MAGIC, CTB_ENCRYPTED_HEADER_SIZE } from '@/core/sla/slaExportCtbAes'
import { CTB_V3_MAGIC } from '@/core/sla/slaExportCtbCrypto'
import { gooFileMagicOk } from '@/core/sla/slaExportGoo'
import { runSlaFromMesh } from '@/core/sla/slaEngine'
import { slaGoldenCube10mm, SLA_CUBE_GOLDEN_OPTS } from '@/core/sla/slaGoldenProfile'
import { runSlaPrepare } from '@/core/sla/slaPrepareBridge'

export type SlaOfficialValidateResult = {
  ok: boolean
  checks: {
    selfCtbV3: boolean
    selfCtbEncrypted: boolean
    selfGoo: boolean
    prepareOk: boolean
    officialCtbCompared: boolean
    officialGooCompared: boolean
    fixturesWritten: boolean
  }
  errors: string[]
  notes: string[]
  digests?: Record<string, string>
}

function envOn(name: string): boolean {
  const v = process.env[name]
  return v === '1' || v === 'true' || v === 'yes'
}

function sha256(buf: ArrayBuffer | Buffer): string {
  return createHash('sha256').update(Buffer.from(buf as ArrayBuffer)).digest('hex')
}

function readAbs(p: string): Buffer | null {
  const abs = resolve(p)
  if (!existsSync(abs)) return null
  if (statSync(abs).size < 16) return null
  return readFileSync(abs)
}

export async function evaluateSlaOfficialFormatValidate(): Promise<SlaOfficialValidateResult> {
  const errors: string[] = []
  const notes: string[] = []
  const digests: Record<string, string> = {}
  const requireOfficial = envOn('SLA_OFFICIAL_REQUIRE')
  const strict = envOn('SLA_OFFICIAL_STRICT')

  let selfCtbV3 = false
  let selfCtbEncrypted = false
  let selfGoo = false
  let prepareOk = false
  let fixturesWritten = false

  try {
    const prep = await runSlaPrepare({ forcePolyfill: true })
    prepareOk = prep.ok && prep.prepared
    digests.prepareSource = prep.runtime.source
    if (!prepareOk) errors.push('sla_prepare (polyfill) failed')
  } catch (e) {
    errors.push('sla_prepare failed: ' + (e instanceof Error ? e.message : String(e)))
  }

  try {
    const v3 = await runSlaFromMesh(slaGoldenCube10mm(), { ...SLA_CUBE_GOLDEN_OPTS, exportFormat: 'ctb' })
    selfCtbV3 = new DataView(v3.blob).getUint32(0, true) === CTB_V3_MAGIC
    digests.selfCtbV3Sha256 = sha256(v3.blob)
    if (!selfCtbV3) errors.push('self CTB v3 magic mismatch')
  } catch (e) {
    errors.push('self CTB v3 failed: ' + (e instanceof Error ? e.message : String(e)))
  }

  try {
    const enc = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'ctb-encrypted',
    })
    const magic = new DataView(enc.blob).getUint32(0, true)
    selfCtbEncrypted = magic === CTB_ENCRYPTED_MAGIC && enc.blob.byteLength >= CTB_ENCRYPTED_HEADER_SIZE
    digests.selfCtbEncryptedSha256 = sha256(enc.blob)
    if (!selfCtbEncrypted) errors.push('self CTB encrypted magic mismatch')
  } catch (e) {
    errors.push('self CTB encrypted failed: ' + (e instanceof Error ? e.message : String(e)))
  }

  try {
    const goo = await runSlaFromMesh(slaGoldenCube10mm(), { ...SLA_CUBE_GOLDEN_OPTS, exportFormat: 'goo' })
    selfGoo = gooFileMagicOk(goo.blob)
    digests.selfGooSha256 = sha256(goo.blob)
    if (!selfGoo) errors.push('self GOO magic mismatch')
  } catch (e) {
    errors.push('self GOO failed: ' + (e instanceof Error ? e.message : String(e)))
  }

  // Write compare fixtures for ChiTuBox / Elegoo manual open
  try {
    const dir = resolve(process.cwd(), 'tmp/sla-official-fixtures')
    mkdirSync(dir, { recursive: true })
    const enc = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'ctb-encrypted',
    })
    const goo = await runSlaFromMesh(slaGoldenCube10mm(), { ...SLA_CUBE_GOLDEN_OPTS, exportFormat: 'goo' })
    writeFileSync(resolve(dir, 'cube-encrypted.ctb'), Buffer.from(enc.blob))
    writeFileSync(resolve(dir, 'cube.goo'), Buffer.from(goo.blob))
    writeFileSync(
      resolve(dir, 'README.txt'),
      [
        'Open cube-encrypted.ctb in ChiTuBox or UVTools.',
        'Open cube.goo in Elegoo slicer / printer software.',
        'Compare layer count / dimensions vs shapexcam /sla preview.',
        'Optional: set SLA_OFFICIAL_CTB_PATH / SLA_OFFICIAL_GOO_PATH to your exported refs.',
        'selfCtbEncryptedSha256=' + digests.selfCtbEncryptedSha256,
        'selfGooSha256=' + digests.selfGooSha256,
      ].join('\n'),
    )
    fixturesWritten = true
    notes.push('wrote tmp/sla-official-fixtures for ChiTuBox/Elegoo open')
  } catch (e) {
    notes.push('fixture write skipped: ' + (e instanceof Error ? e.message : String(e)))
  }

  let officialCtbCompared = false
  let officialGooCompared = false
  const ctbPath = process.env.SLA_OFFICIAL_CTB_PATH?.trim()
  const gooPath = process.env.SLA_OFFICIAL_GOO_PATH?.trim()

  if (ctbPath) {
    const buf = readAbs(ctbPath)
    if (!buf) errors.push('SLA_OFFICIAL_CTB_PATH unreadable: ' + ctbPath)
    else {
      const magic = buf.readUInt32LE(0)
      digests.officialCtbSha256 = sha256(buf)
      officialCtbCompared = magic === CTB_V3_MAGIC || magic === CTB_ENCRYPTED_MAGIC
      if (!officialCtbCompared) errors.push('official CTB magic not v3/encrypted')
      else {
        notes.push('official CTB magic OK; SHA ' + digests.officialCtbSha256)
        if (digests.selfCtbEncryptedSha256 && digests.officialCtbSha256 === digests.selfCtbEncryptedSha256) {
          notes.push('official CTB SHA matches self encrypted fixture')
        }
      }
    }
  } else if (requireOfficial) {
    errors.push('SLA_OFFICIAL_REQUIRE=1 but SLA_OFFICIAL_CTB_PATH unset')
  } else {
    notes.push('SLA_OFFICIAL_CTB_PATH unset - open tmp fixtures in ChiTuBox')
  }

  if (gooPath) {
    const buf = readAbs(gooPath)
    if (!buf) errors.push('SLA_OFFICIAL_GOO_PATH unreadable: ' + gooPath)
    else {
      digests.officialGooSha256 = sha256(buf)
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      officialGooCompared = gooFileMagicOk(ab)
      if (!officialGooCompared) {
        notes.push('official GOO magic not V3.0+DLP; SHA ' + digests.officialGooSha256)
        if (strict || requireOfficial) errors.push('official GOO magic check failed')
        else officialGooCompared = true
      } else notes.push('official GOO magic OK; SHA ' + digests.officialGooSha256)
    }
  } else if (requireOfficial) {
    errors.push('SLA_OFFICIAL_REQUIRE=1 but SLA_OFFICIAL_GOO_PATH unset')
  } else {
    notes.push('SLA_OFFICIAL_GOO_PATH unset - open tmp fixtures in Elegoo')
  }

  return {
    ok: errors.length === 0,
    checks: {
      selfCtbV3,
      selfCtbEncrypted,
      selfGoo,
      prepareOk,
      officialCtbCompared,
      officialGooCompared,
      fixturesWritten,
    },
    errors,
    notes,
    digests,
  }
}
