# ADR: FIB Rich Text + Per-Blank Hints/Feedback

Context
- Fill‑in‑the‑Blank (FIB) now supports multiple blanks per item and needs per‑blank metadata and improved authoring.

Decision
- Author text in limited rich HTML (bold, italic, ordered/bulleted lists).
- Detect blanks via asterisk pairs `*...*` with slash-separated alternatives.
- Persist per‑blank metadata under `item.blanks[]` with options and localized hints/feedback.
- Player renders numbered blanks with circled numerals and per-blank hint buttons.

Authoring Rules
- Use `*Soy/Yo soy*` to define a blank with two correct alternatives.
- Rich formatting is allowed around text; detection is based on plain text content.
- Builder auto-generates a panel with sections: Hueco 1, Hueco 2, … with fields:
  - hint_es, hint_en
  - feedback_correct_es, feedback_correct_en
  - feedback_incorrect_es, feedback_incorrect_en

Schema (per item)
```
{
  id, order,
  text: "<p>... rich HTML ...</p>",
  blanks: [
    {
      index: 1,
      options: ["Soy", "Yo soy"],
      hint_es?, hint_en?,
      feedback_correct_es?, feedback_correct_en?,
      feedback_incorrect_es?, feedback_incorrect_en?
    },
    ...
  ]
}
```

Player Rendering
- Each blank shows: circled number (①), input, hint button (tooltip: Mostrar pista / Show hint).
- Scoring per item requires all blanks correct.
- Shows per‑blank feedback if provided.

Back‑Compat
- If `blanks[]` absent, derive from `*...*` in plain text; no per‑blank metadata.

Consequences
- Authors gain granular control over hints/feedback without losing simple asterisk workflow.
- Data forward-compatible; older items remain functional.
