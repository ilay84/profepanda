# Shared Plan: Exercise Types (TF, MCQ, Dictation, …)

This document captures cross‑cutting improvements and conventions so new exercise types are easy to add and existing ones stay consistent.

## API & Data
- Always fetch `version=current` for previews and set cache headers on JSON:
  - Server: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache` on `/admin/api/exercises*`.
- Align schema and validator:
  - Keep JSON Schemas in `data/schemas/exercises/` in sync with `app/exercises_store.validate_exercise()`.
  - Convention: `attemptsMax=0` means unlimited across all types.

## Core Runtime (static/js/ppx-core.js)
- Central fetch helper in `openExercise`:
  - Append timestamp (`_=${Date.now()}`) to bust caches; use `cache: 'no-store'`.
- Type pill labels centralized:
  - Map type → localized name (e.g., TF, MCQ, DICTADO/DICTATION) — used by admin list and runtime.
- Shared completion helpers:
  - Provide `allDone()` and a “See results” CTA pattern that types can opt into.

## Builder Framework
- Shared builder skeleton (save/preview/publish/export/JSON editor) with:
  - Prefill: server hydration → overlay local draft → `applyPayload()` (inside IIFE).
  - Preview intercept: common utility that overrides fetch for the current slug/version.
- Options UI conventions:
  - “Unlimited attempts” checkbox sets `attemptsMax=0` and disables the numeric input.
  - Standard options keys: `ignoreCase`, `ignorePunctuation`, `normalizeWhitespace`, `ignoreAccents`, `minCharsToEnableCheck`, `allowRetry`, `attemptsMax`, `autoPlay`, `multiline`.

## Summary UI
- Components shared in `ppx-exercise-ui.css`:
  - Score pill with thresholds (≥90 green, ≥80 blue, ≥70 orange, otherwise red).
  - Accordion (`<details class="ppx-acc">`) with only a right chevron (`summary::after`); hide left markers (`::marker`, `::-webkit-details-marker`, `summary::before`).
  - Centered header line: “Resumen”, then “Puntaje: <pill> - X/Y”.
  - List container width: `ppx-summary-list { width: 75%; max-width: 980px; min-width: 520px; }`.
  - Consistent spacing above/below the list and actions.

## CSS / Design System
- Consolidate chips, pills, callouts, accordions, and inline diff classes inside `static/css/ppx-exercise-ui.css` with clear modifiers.
- Accordion hygiene:
  - Hide default marker cross‑engine and keep our right chevron.

## Caching & Versioning
- Server returns `no-store` on index + per‑exercise JSON.
- Client adds a timestamp param to avoid stale loads after saves.

## Validation & Schema
- Shared validation helpers:
  - Booleans: strictly true/false.
  - Integers: non‑negative for `minCharsToEnableCheck`, `attemptsMax >= 0`.
- Keep “unlimited attempts” documented and enforced in both server validator and schema.

## QA / Tooling
- Smoke tests (manual or automated):
  - Save with `attemptsMax=0` → preview from builder → preview from admin list → both show unlimited behavior.
  - Summary renders: header pill + per‑item pills + breakdown (if applicable) + right chevron only.

## Docs / Developer Experience
- Add a short “Add a new exercise type” checklist:
  - Files to create: schema, builder template + JS, runtime plugin, API routes if needed.
  - IDs/classes to reuse (form elements, list container, summary pieces).
  - How to wire preview (intercept) and options.
- AGENTS.md (or this file) referenced at project root so assistants and devs share conventions.

---

Implementation notes:
- This plan describes patterns already applied to Dictation and partially to TF/MCQ. When touching adjacent code, prefer refactors that move duplicated code (builder preview wiring, summary pills) into small shared helpers rather than re‑implementing per type.

