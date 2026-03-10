# 2026-03-06 Connection Symbol Class Design

- Goal: align save/load/autosave/schema for connection symbol class handling.
- Decision: all connection symbols are class-aware; ground rods remain class-aware; no backward-compatibility migration for legacy invalid files.
- Affected areas: schema validation, default symbol-class assignment, tests for file load and autosave restore.
