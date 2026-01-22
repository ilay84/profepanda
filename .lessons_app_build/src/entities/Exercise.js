// src/entities/Exercise.js

export const EXERCISE_TYPES = [
  "explanation",
  "custom_block",
  "content_embed",
  "picture_choice",
  "picture_select_all",
  "vocab_cards",
  "error_spotting",
  "dialogue",
  "example_sentence",
  "word_order",
  "reorder",
  "dictation",
  "dictation_select",
  "dictation_focus",
  "conjugation_map",
  "conjugation_drill",
  "morphology_builder",
  "pronunciation_imitation",
  "select_all",
  "multiple_choice",
  "fill_blank",
  "fill_blanks_select",
  "translation",
  "matching",
];

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "")).filter((v) => v.trim().length > 0);
}

function normalizeExampleSentences(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => ({
      sentence: String(x?.sentence ?? ""),
      translation: String(x?.translation ?? ""),
      audio_url: String(x?.audio_url ?? ""),
    }))
    .filter((x) => x.sentence.trim().length > 0);
}

function normalizeDialogSpeakers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => ({
      name: String(s?.name ?? ""),
      avatar_url: String(s?.avatar_url ?? ""),
    }))
    .filter((s) => s.name.trim().length > 0);
}

function normalizeDialogLines(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((l) => ({
      speaker_index: typeof l?.speaker_index === "number" ? l.speaker_index : 0,
      text: String(l?.text ?? ""),
      translation: String(l?.translation ?? ""),
      audio_url: String(l?.audio_url ?? ""),
    }))
    .filter((l) => l.text.trim().length > 0);
}

function normalizeMatchingPairs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((p) => ({
      left: String(p?.left ?? ""),
      right: String(p?.right ?? ""),
      audio_url: String(p?.audio_url ?? ""),
    }))
    .filter((p) => p.left.trim().length > 0 && p.right.trim().length > 0);
}

function normalizeMorphemePool(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      text: String(item?.text ?? ""),
      type: String(item?.type ?? "root"),
      label: String(item?.label ?? ""),
    }))
    .filter((item) => item.text.trim().length > 0);
}

function normalizeConjugationGroups(value) {
  if (!Array.isArray(value)) return [];
  return value.map((group, groupIndex) => ({
    group_id: String(group?.group_id ?? `group-${groupIndex + 1}`),
    group_title: String(group?.group_title ?? ""),
    slots: Array.isArray(group?.slots)
      ? group.slots.map((slot, slotIndex) => ({
          slot_id: String(slot?.slot_id ?? `slot-${groupIndex + 1}-${slotIndex + 1}`),
          subjects: normalizeStringArray(slot?.subjects),
          accepted_forms: normalizeStringArray(slot?.accepted_forms),
          slot_note_markdown: String(slot?.slot_note_markdown ?? ""),
        }))
      : [],
  }));
}

function normalizeVocabCards(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((card) => ({
      image_url: String(card?.image_url ?? ""),
      label: String(card?.label ?? ""),
      audio_url: String(card?.audio_url ?? ""),
    }))
    .filter((card) => card.image_url.trim().length > 0 || card.label.trim().length > 0);
}

export function normalizeExercise(input = {}) {
  const type = EXERCISE_TYPES.includes(input.type) ? input.type : "multiple_choice";

  return {
    id: input.id ?? "",
    lesson_id: input.lesson_id ?? "",
    type,

    question: input.question ?? "",
    prompt_image_url: input.prompt_image_url ?? "",

    correct_answer: input.correct_answer ?? "",
    options: normalizeStringArray(input.options),

    option_feedback: normalizeStringArray(input.option_feedback),
    picture_options: Array.isArray(input.picture_options)
      ? input.picture_options.map((option) => ({
          image_url: String(option?.image_url ?? ""),
          label: String(option?.label ?? ""),
        }))
      : [],
    vocab_cards: normalizeVocabCards(input.vocab_cards),
    tokens: normalizeStringArray(input.tokens),
    token_feedback: normalizeStringArray(input.token_feedback),
    correction_sentence: input.correction_sentence ?? "",
    correct_indices: normalizeStringArray(input.correct_indices).map((value) => Number(value)),
    correct_index:
      typeof input.correct_index === "number"
        ? input.correct_index
        : Number.isFinite(Number(input.correct_index))
        ? Number(input.correct_index)
        : -1,
    correct_options: normalizeStringArray(input.correct_options),
    correct_feedback: input.correct_feedback ?? "",
    incorrect_feedback: input.incorrect_feedback ?? "",

    hint: input.hint ?? "",

    audio_url: input.audio_url ?? "",
    model_audio_url: input.model_audio_url ?? "",
    post_correct_audio_url: input.post_correct_audio_url ?? "",
    focus_sentence: input.focus_sentence ?? "",
    focus_answers: normalizeStringArray(input.focus_answers),
    focus_options: normalizeStringArray(input.focus_options),

    explanation_content: input.explanation_content ?? "",
    custom_html: input.custom_html ?? "",
    custom_css: input.custom_css ?? "",
    custom_js: input.custom_js ?? "",
    embed_url: input.embed_url ?? "",
    embed_html: input.embed_html ?? "",
    embed_title: input.embed_title ?? "",
    embed_aspect_ratio: input.embed_aspect_ratio ?? "16:9",
    embed_allow_fullscreen:
      typeof input.embed_allow_fullscreen === "boolean"
        ? input.embed_allow_fullscreen
        : true,
    example_sentences: normalizeExampleSentences(input.example_sentences),

    sentence_text: input.sentence_text ?? "",
    sentence_translation: input.sentence_translation ?? "",
    model_text: input.model_text ?? "",

    dialog_speakers: normalizeDialogSpeakers(input.dialog_speakers),
    dialog_lines: normalizeDialogLines(input.dialog_lines),

    matching_pairs: normalizeMatchingPairs(input.matching_pairs),

    fill_blanks_sentence: input.fill_blanks_sentence ?? "",
    fill_blanks_answers: normalizeStringArray(input.fill_blanks_answers),
    fill_blanks_decoys: normalizeStringArray(input.fill_blanks_decoys),
    fill_blanks_feedback: normalizeStringArray(input.fill_blanks_feedback),
    fill_blanks_decoy_feedback: normalizeStringArray(input.fill_blanks_decoy_feedback),

    items: normalizeStringArray(input.items),

    word_order_words: normalizeStringArray(input.word_order_words),
    word_order_decoys: normalizeStringArray(input.word_order_decoys),

    title: input.title ?? "",
    intro_markdown: input.intro_markdown ?? "",
    completion_message_markdown: input.completion_message_markdown ?? "",
    pool_forms: normalizeStringArray(input.pool_forms),
    shuffle_pool: input.shuffle_pool ?? true,
    morpheme_pool: normalizeMorphemePool(input.morpheme_pool),
    correct_sequence: normalizeStringArray(input.correct_sequence),
    show_hyphenation: input.show_hyphenation ?? true,
    stem: input.stem ?? "",
    ending: input.ending ?? "",
    groups: normalizeConjugationGroups(input.groups),

    order: typeof input.order === "number" ? input.order : 0,
  };
}

export function isValidExercise(exercise) {
  return Boolean(exercise?.lesson_id && exercise?.type);
}
