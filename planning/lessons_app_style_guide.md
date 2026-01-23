# ProfePanda Markdown Style Guide

This guide defines consistent Markdown and formatting practices for all
ProfePanda Lessons App content. It ensures lessons are visually clear,
pedagogically sound, and easy to process for learners.

---

## General Principles
- Sentence length: 1-2 sentences preferred; up to 4 only when essential.
- Voice: Direct, teacher-to-learner tone.
- Register: Neutral, warm, and confidence-building.
- Language: Always written in the learner's interface language.
- Whitespace: Use one blank line between Markdown blocks.
- Avoid clutter: Favor short sections and natural examples over dense explanations.

---

## Branding + UI Tokens (Current)

Source of truth: `static/css/courses.css` (public + courses UI) and Lessons App styling.

Core brand tokens:
- Brand blue (primary): `#475dd7` (`--pp-inprogress`)
- Brand blue (soft): `#e7eaff` (`--pp-inprogress-soft`)
- Brand blue (ring): `#c6cdfb` (`--pp-inprogress-ring`)
- Brand blue (hover): `#3b4fc3` (`--pp-inprogress-hover`)

Success tokens:
- Complete: `#80ac5f` (`--pp-complete`)
- Complete (soft): `#eaf2e3` (`--pp-complete-soft`)
- Complete (ring): `#c7ddb4` (`--pp-complete-ring`)
- Complete (hover): `#6f9951` (`--pp-complete-hover`)

Secondary state tokens:
- Not started: `#d25c7f` (`--pp-notstarted`)
- Not started (soft): `#fde7ee` (`--pp-notstarted-soft`)
- Not started (ring): `#f5bfd0` (`--pp-notstarted-ring`)
- Not started (hover): `#be4d70` (`--pp-notstarted-hover`)

Neutral slate palette (common UI surfaces):
- `#0f172a` (slate-900), `#475569` (slate-600), `#64748b` (slate-500)
- `#94a3b8` (slate-400), `#cbd5e1` (slate-300), `#e2e8f0` (slate-200)
- `#f1f5f9` (slate-100), `#ffffff` (white)

Accent indigo (supporting UI):
- `#4f46e5` (indigo-600), `#6366f1` (indigo-500)
- `#e0e7ff` (indigo-100), `#c7d2fe` (indigo-200), `#3730a3` (indigo-800)

Notes:
- Bold markdown should render in normal text color (black).
- Backticks render in brand blue (`#475dd7`) for Spanish targets and endings.
- In feedback fields, wrap Spanish keywords/targets in backticks so they render highlighted.
- Success/incorrect feedback uses the success and error families above.

---

## Text Styling
| Element | Style | Example |
|---|---|---|
| Spanish word/phrase in English explanations/titles | `Backticks` (blue) | "Use `estoy` for temporary states." |
| English word needing contrast or stress | *Italics* | "Use **ser**, *not* **estar**." |
| Target form or phrase in example sentences | `Backticks` (blue) | "Yo `estoy` cansado." |
| Verb endings in Conjugation Map | Backticks | "`habl`o``, `habl`as``, `habl`a``" |
| Grammar tags or labels | Small caps or plain text | "Form: first-person singular" |

Backticks are the only way to apply the brand blue highlight.

---

## Example Sentences
- Use backticks for the target item (renders in #475dd7).
- Keep natural and culturally neutral; 7-10 words max.
- Provide translations in *italics* directly below the sentence.
- Maintain one idea per example.

Example:
Yo `quiero` un cafe.
*I want a coffee.*

---

## Vocab Cards (Image-Based)
- Use for vocabulary explanation or quick review.
- Each card should have an image and a label.
- Label text is bold and black by default; use backticks to color specific segments in #475dd7.
- If audio is included, use a small play icon; no speed controls.
- Keep labels short (1-3 words).

---

## Explanations
- Avoid using `explanation_content` unless a concept truly requires a standalone
  explanation without direct practice.
- When used, structure it by meaning -> use -> form.
- Include at most one brief "noticing" question at the end.

Example:
### Meaning
*Estar* helps us talk about temporary states or locations.

### Use
We use *estar* to describe feelings or where someone is.

Can you think of another example with *estar*?

---

## Practice Exercises
- Reflective or self-check content must be delivered through existing exercise
  types, not a standalone content type.
- To prompt reflection, use Multiple Choice, Matching, or Sorting exercises.
- Keep instructions short, clear, and positive:
  - "Choose the best option."
  - "Which sentence sounds natural?"

## Feedback (All Exercise Types)
- In any feedback field (`option_feedback`, `correct_feedback`, `incorrect_feedback`, `token_feedback`, `fill_blanks_feedback`, `fill_blanks_decoy_feedback`), wrap Spanish target words/phrases in backticks for blue highlight.
- Keep feedback short, specific, and confidence-building.

---

## Reflection and Self-Check
- No dedicated self-check type; integrate reflective checks within exercises.

Example (Multiple Choice with reflection):
Question: Which sentence sounds natural in Spanish?
a) Yo `soy` cansado.
b) Yo `estoy` cansado.

Correct: b) Yo `estoy` cansado.
"Nice! You noticed we use *estar* for temporary states like feelings."

---

## Cultural and Regional Notes
- Keep brief and relevant to language use.
- Use blockquote formatting:
  > **Tip:** In Spain, people often say *vosotros estais*, while in Latin America,
  > *ustedes estan* is common.

---

## Summary of Formatting Rules
| Element | Format |
|---|---|
| Spanish target word in explanation/title | `Backticks` (blue) |
| English emphasis | *Italics* |
| Target form in example | `Backticks` (blue) |
| Verb endings (Conjugation Map only) | `backticks` |
| Max sentence length | 4 |
| Self-check | Done via existing exercise types |
| Explanation content type | Use sparingly |
