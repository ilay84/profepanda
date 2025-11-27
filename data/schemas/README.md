Schemas for exercise payloads

This folder documents the JSON structure expected by the front‑end plugins and
validated in `app/exercises_store.validate_exercise()`.

Notes
- These schemas are intentionally minimal. They capture required fields and
  general shapes, and are not meant to be exhaustive.
- Validation at runtime relies on the lightweight checks in
  `validate_exercise()`; the schemas here serve as documentation and for
  optional tooling.

Files
- `tf.schema.json`: True/False exercise payload
- `mcq.schema.json`: Multiple‑choice exercise payload

