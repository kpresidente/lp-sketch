# Handled Error Telemetry Design

**Goal:** Reuse the existing client telemetry pipeline to report high-value handled operational failures that currently only surface as UI error messages.

## Decisions

- Reuse the existing telemetry transport, redaction, and environment configuration in `src/lib/telemetry.ts`.
- Add a separate handled-operation event family instead of overloading the existing `client_error` event.
- Instrument only high-value recoverable failures:
  - project load/import failures
  - autosave persist/restore/discard failures
  - export failures
- Do not emit telemetry for routine UI validation messages or normal user guidance.

## Event Shape

Each handled telemetry event includes:

- `event`: explicit operation name such as `project_load_failed`
- `occurredAt`
- `release`
- `environment`
- `page`
- `message`: sanitized error summary
- `context`: sanitized structured metadata

Context stays narrow and excludes project JSON, PDF bytes, and arbitrary user-authored content.

## Initial Event Set

- `project_load_failed`
- `project_import_pdf_failed`
- `autosave_restore_discarded`
- `autosave_persist_failed`
- `project_export_failed`

## Initial Context Fields

- Project load/import:
  - `file_name`
  - `file_size`
  - `schema_version`
  - `symbol_count`
  - `element_count`
  - `pdf_source_type`
- Autosave:
  - `reason`
  - `degraded`
  - `storage_key_present`
  - `schema_version`
  - `element_count`
- Export:
  - `format`
  - `has_background_canvas`
  - `current_page`
  - `page_count`

## Implementation Notes

- Keep `setError(...)` unchanged. Telemetry is additive and should be emitted explicitly at selected failure sites.
- Add focused tests for payload construction and emission from the target hooks.
- Update operations documentation to clarify that the telemetry environment variables apply to handled operational events as well as uncaught runtime failures.
