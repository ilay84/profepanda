# Block Registry (Authoring Reference)

Quick reference for content block shapes, required/optional fields, and allowed `style_variant`s. Use alongside the single schema `planning/content.schema.json`.

| type | required data | optional data | allowed style_variant examples |
| --- | --- | --- | --- |
| heading | `segments` (Segment[]) | — | `h1`, `h2`, `h3` |
| text | `segments` (Segment[]) | `style_variant` | `body`, `subtitle`, `lead` |
| list | `ordered` (bool), `items` (ListItem[]) | — | — |
| callout | `segments` (Segment[]), `icon` | — | `info`, `warning`, `success` |
| table | `columns` (id,label[]), `rows` (Row[]) | — | — |
| media | `kind` (`image`/`audio`/`video`/`document`), `src`, `alt_es`, `alt_en` | `caption_segments` (Segment[]) | — |
| embed | `provider`, `embed_type`, `src`, `title` | `aspect_ratio` | — |
| exercise_reference | `exercise_id` | `exercise_type`, `source`, `resource_path`, `display_options` | — |
| example_sentence | `language_primary`, `language_translation`, `segments_primary`, `segments_translation` | `audio` (source, src, mime_type, duration_seconds), `player_options` | `callout_info`, `callout_success` |

Segment shape:
- `segment_id` (string), `text` (string), `marks` (string[]), `translations` (map lang → string, optional)

ListItem shape:
- `item_id` (string), `segments` (Segment[])

Table row:
- `row_id` (string), `cells` (map column id → Segment[])

Exercise display_options (examples):
- `show_title` (bool), `show_instructions` (bool), `shuffle` (bool), `theme_variant` (string)

Example_sentence audio:
- `source` (`uploaded` | `url`), `src` (string), `mime_type` (string), `duration_seconds` (number)

Notes:
- `style_variant` must come from the allowed set per block; the theme maps variants to visuals.
- Blocks are modular; new types should extend the schema in `planning/content.schema.json`.
