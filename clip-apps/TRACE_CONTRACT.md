# Trace Contract (CAM/FDM)

This document defines the canonical trace metadata contract used by CAM/FDM diagnostics and export flows in `clip-apps`.

## Goals

- Keep migration audit metadata stable across copy/export paths.
- Guarantee deterministic key naming and line order.
- Make manual review and automated diff tooling use the same contract.

## Canonical Keys

Defined in `src/core/traceKeys.ts`:

- `traceSchemaVersion`
- `sourceLabel`
- `sourceFingerprint`
- `<none>` as empty placeholder

Current schema:

- `traceSchemaVersion=1`

## Ordered Header Contract

All trace headers MUST use this exact order:

1. `traceSchemaVersion`
2. `sourceLabel`
3. `sourceFingerprint`

Use `buildTraceHeaderLines(sourceLabel, sourceFingerprint)` for plain `key=value` lines and
`buildTraceCommentLines(sourceLabel, sourceFingerprint)` for `; key=value` comment lines.

## JSON Trace Contract

When trace metadata is emitted inside JSON payloads, it MUST be under a `trace` object and include:

- `trace.traceSchemaVersion`
- `trace.sourceLabel`
- `trace.sourceFingerprint`

Current JSON writers that follow this contract:

- `src/core/cam/sessionBundleExport.ts`
- `src/core/cam/sessionDiffLog.ts`
- `src/core/slicer/estimateMetaExport.ts`

## Text Trace Contract

When trace metadata is emitted in text blocks, it MUST emit ordered `key=value` lines from shared helpers:

- `src/core/cam/sessionBundleLegacyHintCompare.ts`
- `src/core/slicer/legacyFdmCompareText.ts`
- `src/apps/cam/CamWorkspace.vue` (export/save gcode paths)
- `src/views/fdm/FdmWorkspaceView.vue` (diagnostic copy/export gcode paths)

For G-code/comment outputs, the format is:

- `; traceSchemaVersion=1`
- `; sourceLabel=...`
- `; sourceFingerprint=...`

## Source Derivation Rules

- `sourceLabel`: human-readable source anchor (e.g. `runId:runName`, `jobId:jobName`, or `current:<process>` fallback).
- `sourceFingerprint`: deterministic source identity for diff/replay (existing CAM hash or FDM deterministic digest hash).
- Missing values MUST use `<none>` and MUST NOT omit required keys.

## Backward Compatibility

- New trace fields should bump `TRACE_SCHEMA_VERSION`.
- Older parsers should ignore unknown trace keys.
- Existing key names must remain stable unless schema version is incremented.

## Verification

Contract-level tests:

- `src/core/traceKeys.spec.ts` (ordered header + comment lines)
- `src/core/cam/sessionBundleLegacyHintCompare.spec.ts`
- `src/core/slicer/legacyFdmCompareText.spec.ts`
- `src/core/cam/sessionBundleExport.spec.ts`
- `src/core/cam/sessionDiffLog.spec.ts`
- `src/core/slicer/estimateMetaExport.spec.ts`

Shared fixture source for trace examples used in tests:

- `src/core/traceFixtures.ts`
- canonical example constants:
  - `TRACE_FIXTURE_SOURCE_LABEL`
  - `TRACE_FIXTURE_SOURCE_FINGERPRINT`
  - `TRACE_FIXTURE_HEADER_LINES`
  - `TRACE_FIXTURE_COMMENT_LINES`

## Minimal Examples

### CAM comparison bundle (text)

```text
--- comparisonMeta ---
schemaVersion=1
bundleKind=camLegacyComparison
generatedAt=2026-05-01T10:00:00.000Z
traceSchemaVersion=1
sourceLabel=job-1:Benchy
sourceFingerprint=fnv1a32:abcd1234

--- targetLegacy ---
targetLegacy.ready=1
targetLegacy.hasSlice=1
targetLegacy.hasExport=1
targetLegacy.importError=<none>
```

### FDM comparison bundle (text)

```text
--- comparisonMeta ---
schemaVersion=1
bundleKind=fdmLegacyComparison
generatedAt=2026-05-01T10:00:00.000Z
traceSchemaVersion=1
sourceLabel=job-1:Benchy
sourceFingerprint=fnv1a32:abcd1234
```

### Session bundle export trace (JSON)

```json
{
  "trace": {
    "traceSchemaVersion": 1,
    "sourceLabel": "job-1:Benchy",
    "sourceFingerprint": "fnv1a32:abcd1234"
  }
}
```

### Estimate meta export trace (JSON)

```json
{
  "trace": {
    "traceSchemaVersion": 1,
    "sourceLabel": "job-1:Benchy",
    "sourceFingerprint": "fnv1a32:abcd1234"
  }
}
```
