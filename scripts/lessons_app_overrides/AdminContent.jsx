
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import deleteIcon from "../../assets/icons/lessons/delete.svg";
import editIcon from "../../assets/icons/lessons/edit.svg";
import multipleChoiceIcon from "../../assets/icons/lessons/multiple-choice.svg";
import translationIcon from "../../assets/icons/lessons/translation.svg";
import fillBlankIcon from "../../assets/icons/lessons/fill-in-the-blank.svg";
import fillBlanksSelectIcon from "../../assets/icons/lessons/fill-in-the-blanks-select.svg";
import matchingIcon from "../../assets/icons/lessons/matching.svg";
import explanationIcon from "../../assets/icons/lessons/explanation.svg";
import exampleSentenceIcon from "../../assets/icons/lessons/example-sentence.svg";
import dialogueIcon from "../../assets/icons/lessons/dialogue.svg";
import wordOrderIcon from "../../assets/icons/lessons/order.svg";
import reorderIcon from "../../assets/icons/lessons/reorder.svg";
import dictationIcon from "../../assets/icons/lessons/dictation.svg";
import dictationSelectIcon from "../../assets/icons/lessons/dictation-select.svg";
import pronunciationImitationIcon from "../../assets/icons/lessons/pronunciation-imitation.svg";
import conjugationMapIcon from "../../assets/icons/lessons/conjugation-map.svg";
import morphologyBuilderIcon from "../../assets/icons/lessons/morphology-builder.svg";
import conjugationDrillIcon from "../../assets/icons/lessons/conjugation-drill.svg";
import imageSelectIcon from "../../assets/icons/lessons/image-select.svg";
import vocabCardsIcon from "../../assets/icons/lessons/vocab-cards.svg";
import customBlockIcon from "../../assets/icons/lessons/custom-block.svg";
import errorSpottingIcon from "../../assets/icons/lessons/error-spotting.svg";
import uploadIcon from "../../assets/icons/lessons/upload.svg";
import contentEmbedIcon from "../../assets/icons/lessons/custom-block.svg";

import { listAllCourses } from "../../services/courses.js";
import { listLessonsForCourse } from "../../services/lessons.js";
import {
  createExercise,
  createExerciseWithError,
  deleteExercise,
  listExercisesForLesson,
  updateExercise,
  updateExerciseWithError,
} from "../../services/exercises.js";

const EXERCISE_TYPES = [
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: multipleChoiceIcon,
    badgeClass: "bg-blue-100 text-blue-700",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "translation",
    label: "Translation",
    icon: translationIcon,
    badgeClass: "bg-purple-100 text-purple-700",
    iconClass: "bg-purple-100 text-purple-700",
  },
  {
    value: "fill_blank",
    label: "Fill in the Blank",
    icon: fillBlankIcon,
    badgeClass: "bg-emerald-100 text-emerald-700",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "fill_blanks_select",
    label: "Fill Blanks (Select)",
    icon: fillBlanksSelectIcon,
    badgeClass: "bg-sky-100 text-sky-700",
    iconClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "matching",
    label: "Matching",
    icon: matchingIcon,
    badgeClass: "bg-amber-100 text-amber-700",
    iconClass: "bg-amber-100 text-amber-700",
  },
  {
    value: "explanation",
    label: "Explanation",
    icon: explanationIcon,
    badgeClass: "bg-slate-100 text-slate-700",
    iconClass: "bg-slate-100 text-slate-700",
  },
  {
    value: "custom_block",
    label: "Custom Block",
    icon: customBlockIcon,
    badgeClass: "bg-slate-100 text-slate-700",
    iconClass: "bg-slate-100 text-slate-700",
  },
  {
    value: "content_embed",
    label: "Content Embed",
    icon: contentEmbedIcon,
    badgeClass: "bg-slate-100 text-slate-700",
    iconClass: "bg-slate-100 text-slate-700",
  },
  {
    value: "picture_choice",
    label: "Picture Choice",
    icon: imageSelectIcon,
    badgeClass: "bg-blue-100 text-blue-700",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "picture_select_all",
    label: "Picture Choice (Multi)",
    icon: imageSelectIcon,
    badgeClass: "bg-blue-100 text-blue-700",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "vocab_cards",
    label: "Vocab Cards",
    icon: vocabCardsIcon,
    badgeClass: "bg-blue-100 text-blue-700",
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    value: "error_spotting",
    label: "Error Spotting",
    icon: errorSpottingIcon,
    badgeClass: "bg-amber-100 text-amber-700",
    iconClass: "bg-amber-100 text-amber-700",
  },
  {
    value: "example_sentence",
    label: "Example Sentence",
    icon: exampleSentenceIcon,
    badgeClass: "bg-teal-100 text-teal-700",
    iconClass: "bg-teal-100 text-teal-700",
  },
  {
    value: "dialogue",
    label: "Dialogue",
    icon: dialogueIcon,
    badgeClass: "bg-violet-100 text-violet-700",
    iconClass: "bg-violet-100 text-violet-700",
  },
  {
    value: "word_order",
    label: "Word Order",
    icon: wordOrderIcon,
    badgeClass: "bg-rose-100 text-rose-700",
    iconClass: "bg-rose-100 text-rose-700",
  },
  {
    value: "reorder",
    label: "Reorder",
    icon: reorderIcon,
    badgeClass: "bg-rose-100 text-rose-700",
    iconClass: "bg-rose-100 text-rose-700",
  },
  {
    value: "dictation",
    label: "Dictation",
    icon: dictationIcon,
    badgeClass: "bg-cyan-100 text-cyan-700",
    iconClass: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "pronunciation_imitation",
    label: "Pronunciation Imitation",
    icon: pronunciationImitationIcon,
    badgeClass: "bg-cyan-100 text-cyan-700",
    iconClass: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "dictation_select",
    label: "Dictation (Select)",
    icon: dictationSelectIcon,
    badgeClass: "bg-sky-100 text-sky-700",
    iconClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "dictation_focus",
    label: "Dictation (Focus)",
    icon: dictationIcon,
    badgeClass: "bg-cyan-100 text-cyan-700",
    iconClass: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "select_all",
    label: "Select All",
    icon: multipleChoiceIcon,
    badgeClass: "bg-lime-100 text-lime-700",
    iconClass: "bg-lime-100 text-lime-700",
  },
  {
    value: "conjugation_map",
    label: "Conjugation Map",
    icon: conjugationMapIcon,
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconClass: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "conjugation_drill",
    label: "Conjugation Drill",
    icon: conjugationDrillIcon,
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconClass: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "morphology_builder",
    label: "Morphology Builder",
    icon: morphologyBuilderIcon,
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconClass: "bg-indigo-100 text-indigo-700",
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function splitList(value) {
  return String(value || "")
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function joinList(value) {
  if (!Array.isArray(value)) return "";
  return value.join(", ");
}

function countPlaceholders(value) {
  const regex = /\{(\d+)\}/g;
  let match = null;
  let max = 0;
  const text = String(value || "");
  while ((match = regex.exec(text)) !== null) {
    const index = Number(match[1]);
    if (Number.isFinite(index)) {
      max = Math.max(max, index);
    }
  }
  return max;
}

function normalizeListLength(list, length) {
  const next = Array.isArray(list) ? [...list] : [];
  while (next.length < length) next.push("");
  if (next.length > length) next.length = length;
  return next;
}

function AudioUrlField({ label, value, onChange, helpText, onUpload }) {
  const fileRef = useRef(null);

  const handlePickFile = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      onUpload(file);
    }
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <div className="flex items-center gap-2">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={handlePickFile}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <img src={uploadIcon} alt="" className="h-4 w-4" />
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
    </div>
  );
}

function ImageUrlField({ label, value, onChange, helpText, onUpload }) {
  const fileRef = useRef(null);

  const handlePickFile = () => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      onUpload(file);
    }
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <div className="flex items-center gap-2">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={handlePickFile}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <img src={uploadIcon} alt="" className="h-4 w-4" />
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
    </div>
  );
}

export default function AdminContent() {
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editorMode, setEditorMode] = useState("form");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveAttempt, setSaveAttempt] = useState("");
  const [poolFormsText, setPoolFormsText] = useState("");
  const [dragExerciseId, setDragExerciseId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!typeMenuOpen) return;
    const handleClick = (event) => {
      if (!typeMenuRef.current) return;
      if (!typeMenuRef.current.contains(event.target)) {
        setTypeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [typeMenuOpen]);

  useEffect(() => {
    (async () => {
      const data = await listAllCourses();
      setCourses(data);
    })();
  }, []);

  useEffect(() => {
    if (!courses.length) return;
    const params = new URLSearchParams(location.search);
    const queryCourseId = params.get("courseId");
    const next = queryCourseId && courses.some((c) => c.id === queryCourseId)
      ? queryCourseId
      : courses[0].id;
    if (next && next !== selectedCourseId) {
      setSelectedCourseId(next);
    }
  }, [location.search, courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    (async () => {
      const data = await listLessonsForCourse(selectedCourseId);
      setLessons(data);
    })();
  }, [selectedCourseId]);

  useEffect(() => {
    if (!lessons.length) return;
    const params = new URLSearchParams(location.search);
    const queryLessonId = params.get("lessonId");
    const next = queryLessonId && lessons.some((l) => l.id === queryLessonId)
      ? queryLessonId
      : lessons[0].id;
    if (next && next !== selectedLessonId) {
      setSelectedLessonId(next);
    }
  }, [location.search, lessons, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId) return;
    (async () => {
      setLoading(true);
      const data = await listExercisesForLesson(selectedLessonId);
      setExercises(data);
      setLoading(false);
    })();
  }, [selectedLessonId]);

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [exercises]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  const exerciseMeta = (type) =>
    EXERCISE_TYPES.find((t) => t.value === type) || EXERCISE_TYPES[0];
  const selectedTypeMeta = draft ? exerciseMeta(draft.type) : EXERCISE_TYPES[0];

  const normalizeDraft = (input) => {
    const normalizeGroups = (value) => {
      if (!Array.isArray(value)) return [];
      return value.map((group, groupIndex) => ({
        group_id: group?.group_id || `group-${groupIndex + 1}`,
        group_title: group?.group_title || "",
        slots: Array.isArray(group?.slots)
          ? group.slots.map((slot, slotIndex) => ({
              slot_id: slot?.slot_id || `slot-${groupIndex + 1}-${slotIndex + 1}`,
              subjects: Array.isArray(slot?.subjects) ? slot.subjects : [],
              accepted_forms: Array.isArray(slot?.accepted_forms)
                ? slot.accepted_forms
                : [],
              slot_note_markdown: slot?.slot_note_markdown || "",
            }))
          : [],
      }));
    };

    const next = {
      ...input,
      lesson_id: input.lesson_id || selectedLessonId,
      type: input.type || "multiple_choice",
      title: input.title || "",
      question: input.question || "",
      prompt_image_url: input.prompt_image_url || "",
      correct_answer: input.correct_answer || "",
      correct_index:
        typeof input.correct_index === "number"
          ? input.correct_index
          : Number.isFinite(Number(input.correct_index))
          ? Number(input.correct_index)
          : -1,
      correct_indices: Array.isArray(input.correct_indices)
        ? input.correct_indices.filter((value) => Number.isFinite(Number(value))).map(Number)
        : typeof input.correct_index === "number"
        ? [input.correct_index]
        : Number.isFinite(Number(input.correct_index))
        ? [Number(input.correct_index)]
        : [],
      correction_sentence: input.correction_sentence || "",
      correct_feedback: input.correct_feedback || "",
      incorrect_feedback: input.incorrect_feedback || "",
      options: Array.isArray(input.options) ? input.options : [],
      option_feedback: Array.isArray(input.option_feedback)
        ? input.option_feedback
        : [],
      picture_options: Array.isArray(input.picture_options)
        ? input.picture_options.map((option) => ({
            image_url: option?.image_url || "",
            label: option?.label || "",
          }))
        : [],
      vocab_cards: Array.isArray(input.vocab_cards)
        ? input.vocab_cards.map((card) => ({
            image_url: card?.image_url || "",
            label: card?.label || "",
            audio_url: card?.audio_url || "",
          }))
        : [],
      tokens: Array.isArray(input.tokens) ? input.tokens : [],
      token_feedback: Array.isArray(input.token_feedback) ? input.token_feedback : [],
      correct_options: Array.isArray(input.correct_options)
        ? input.correct_options
        : [],
      hint: input.hint || "",
      explanation_content: input.explanation_content || "",
      custom_html: input.custom_html || "",
      custom_css: input.custom_css || "",
      custom_js: input.custom_js || "",
      embed_url: input.embed_url || "",
      embed_html: input.embed_html || "",
      embed_title: input.embed_title || "",
      embed_aspect_ratio: input.embed_aspect_ratio || "16:9",
      embed_allow_fullscreen: input.embed_allow_fullscreen !== false,
      example_sentences: Array.isArray(input.example_sentences)
        ? input.example_sentences
        : [],
      sentence_text: input.sentence_text || "",
      sentence_translation: input.sentence_translation || "",
      audio_url: input.audio_url || "",
      model_audio_url: input.model_audio_url || "",
      post_correct_audio_url: input.post_correct_audio_url || "",
      focus_sentence: input.focus_sentence || "",
      focus_answers: Array.isArray(input.focus_answers) ? input.focus_answers : [],
      focus_options: Array.isArray(input.focus_options) ? input.focus_options : [],
      matching_pairs: Array.isArray(input.matching_pairs)
        ? input.matching_pairs
        : [],
      dialog_speakers: Array.isArray(input.dialog_speakers)
        ? input.dialog_speakers
        : [],
      dialog_lines: Array.isArray(input.dialog_lines)
        ? input.dialog_lines
        : [],
      fill_blanks_sentence: input.fill_blanks_sentence || "",
      fill_blanks_answers: Array.isArray(input.fill_blanks_answers)
        ? input.fill_blanks_answers
        : [],
      fill_blanks_decoys: Array.isArray(input.fill_blanks_decoys)
        ? input.fill_blanks_decoys
        : [],
      fill_blanks_feedback: Array.isArray(input.fill_blanks_feedback)
        ? input.fill_blanks_feedback
        : [],
      fill_blanks_decoy_feedback: Array.isArray(input.fill_blanks_decoy_feedback)
        ? input.fill_blanks_decoy_feedback
        : [],
      items: Array.isArray(input.items) ? input.items : [],
      word_order_words: Array.isArray(input.word_order_words)
        ? input.word_order_words
        : [],
      word_order_decoys: Array.isArray(input.word_order_decoys)
        ? input.word_order_decoys
        : [],
      intro_markdown: input.intro_markdown || "",
      completion_message_markdown: input.completion_message_markdown || "",
      model_text: input.model_text || "",
      pool_forms: Array.isArray(input.pool_forms) ? input.pool_forms : [],
      shuffle_pool: input.shuffle_pool !== false,
      morpheme_pool: Array.isArray(input.morpheme_pool)
        ? input.morpheme_pool.map((item) => ({
            text: item?.text || "",
            type: item?.type || "root",
            label: item?.label || "",
          }))
        : [],
      correct_sequence: Array.isArray(input.correct_sequence)
        ? input.correct_sequence
        : [],
      show_hyphenation: input.show_hyphenation !== false,
      stem: input.stem || "",
      ending: input.ending || "",
      groups: normalizeGroups(input.groups),
    };
    if (next.type === "multiple_choice" && next.options.length === 0) {
      next.options = ["Option 1", "Option 2"];
    }
    if (next.type === "dictation_select" && next.options.length === 0) {
      next.options = ["Option 1", "Option 2"];
    }
    if (next.type === "picture_choice" && next.picture_options.length === 0) {
      next.picture_options = [
        { image_url: "", label: "Option 1" },
        { image_url: "", label: "Option 2" },
        { image_url: "", label: "Option 3" },
      ];
    }
    if (next.type === "picture_select_all" && next.picture_options.length === 0) {
      next.picture_options = [
        { image_url: "", label: "Option 1" },
        { image_url: "", label: "Option 2" },
        { image_url: "", label: "Option 3" },
      ];
    }
    if (next.type === "vocab_cards" && next.vocab_cards.length === 0) {
      next.vocab_cards = [
        { image_url: "", label: "Card 1", audio_url: "" },
        { image_url: "", label: "Card 2", audio_url: "" },
      ];
    }
    if (next.type === "error_spotting" && next.tokens.length === 0) {
      next.tokens = ["Yo", "eres", "estudiante", "."];
      next.token_feedback = ["", "", "", ""];
      next.correct_index = 1;
      next.correct_indices = [1];
      next.correction_sentence = "Yo **soy** estudiante.";
    }
    while (next.option_feedback.length < next.options.length) {
      next.option_feedback.push("");
    }
    if (next.type === "picture_choice") {
      while (next.option_feedback.length < next.picture_options.length) {
        next.option_feedback.push("");
      }
      if (next.correct_index < 0 || next.correct_index >= next.picture_options.length) {
        next.correct_index = 0;
      }
    }
    if (next.type === "picture_select_all") {
      while (next.option_feedback.length < next.picture_options.length) {
        next.option_feedback.push("");
      }
      if (!Array.isArray(next.correct_indices) || next.correct_indices.length === 0) {
        next.correct_indices = [0];
      }
      next.correct_indices = next.correct_indices
        .map((value) => Number(value))
        .filter(
          (value) => Number.isFinite(value) && value >= 0 && value < next.picture_options.length
        );
      if (next.correct_indices.length === 0) {
        next.correct_indices = [0];
      }
      if (!Number.isFinite(next.correct_index)) {
        next.correct_index = next.correct_indices[0];
      }
    }
    if (next.type === "error_spotting") {
      while (next.token_feedback.length < next.tokens.length) {
        next.token_feedback.push("");
      }
      if (!Array.isArray(next.correct_indices) || next.correct_indices.length === 0) {
        next.correct_indices = Number.isFinite(next.correct_index) ? [next.correct_index] : [0];
      }
      next.correct_indices = next.correct_indices
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0 && value < next.tokens.length);
      if (next.correct_indices.length === 0) {
        next.correct_indices = [0];
      }
      if (!Number.isFinite(next.correct_index)) {
        next.correct_index = next.correct_indices[0];
      }
    }
    if (next.type === "dictation_select" && !next.correct_answer) {
      next.correct_answer = next.options[0] || "";
    }
    next.matching_pairs = next.matching_pairs.map((pair) => ({
      left: pair.left || "",
      right: pair.right || "",
      audio_url: pair.audio_url || "",
    }));
    if (next.type === "matching" && next.matching_pairs.length === 0) {
      next.matching_pairs = [{ left: "", right: "", audio_url: "" }];
    }
    if (next.type === "dialogue" && next.dialog_speakers.length === 0) {
      next.dialog_speakers = [
        { name: "Speaker 1", avatar_url: "" },
        { name: "Speaker 2", avatar_url: "" },
      ];
    }
    if (next.type === "dialogue" && next.dialog_lines.length === 0) {
      next.dialog_lines = [
        { speaker_index: 0, text: "", translation: "", audio_url: "" },
      ];
    }
    if (next.type === "fill_blanks_select" && next.fill_blanks_answers.length === 0) {
      next.fill_blanks_answers = ["Hola", "soy"];
    }
    if (next.type === "fill_blanks_select" && next.fill_blanks_decoys.length === 0) {
      next.fill_blanks_decoys = ["tu", "es"];
    }
    if (next.type === "fill_blanks_select") {
      while (next.fill_blanks_feedback.length < next.fill_blanks_answers.length) {
        next.fill_blanks_feedback.push("");
      }
      while (next.fill_blanks_decoy_feedback.length < next.fill_blanks_decoys.length) {
        next.fill_blanks_decoy_feedback.push("");
      }
    }
    if (next.type === "fill_blanks_select" && !next.fill_blanks_sentence) {
      next.fill_blanks_sentence = "Yo {1} {2}.";
    }
    if (next.type === "dictation_focus" && !next.focus_sentence) {
      next.focus_sentence = "Yo {1} {2}.";
    }
    if (next.type === "dictation_focus" && next.focus_answers.length === 0) {
      next.focus_answers = ["soy", "estudiante"];
    }
    if (next.type === "dictation_focus") {
      const focusCount = countPlaceholders(next.focus_sentence);
      if (focusCount > 0) {
        next.focus_answers = normalizeListLength(next.focus_answers, focusCount);
      }
    }
    if (next.type === "dictation_focus" && next.focus_options.length === 0) {
      next.focus_options = [...next.focus_answers, "tu", "es"];
    }
    if (next.type === "reorder" && next.items.length === 0) {
      next.items = [
        "First, wash your hands.",
        "Then, cut the vegetables.",
        "Finally, serve the salad.",
      ];
    }
    if (next.type === "morphology_builder" && next.morpheme_pool.length === 0) {
      next.morpheme_pool = [
        { text: "re-", type: "prefix", label: "" },
        { text: "use", type: "root", label: "" },
        { text: "-able", type: "suffix", label: "" },
        { text: "-ment", type: "suffix", label: "" },
      ];
    }
    if (next.type === "morphology_builder" && next.correct_sequence.length === 0) {
      next.correct_sequence = ["re-", "use", "-able"];
    }
    if (next.type === "conjugation_drill") {
      if (!next.correct_answer) {
        next.correct_answer = "hablo";
      }
      if (!next.stem) {
        next.stem = "habl";
      }
      if (!next.ending) {
        next.ending = "o";
      }
    }
    if (next.type === "word_order" && next.word_order_words.length === 0) {
      next.word_order_words = ["Hola", "soy"];
    }
    if (next.type === "word_order" && next.word_order_decoys.length === 0) {
      next.word_order_decoys = ["tu", "es"];
    }
    if (next.type === "select_all" && next.options.length === 0) {
      next.options = ["Option 1", "Option 2", "Option 3"];
    }
    if (next.type === "conjugation_map" && next.pool_forms.length === 0) {
      next.pool_forms = ["habl`o`", "habl`as`", "habl`a`", "habl`amos`"];
    }
    if (next.type === "conjugation_map" && next.groups.length === 0) {
      next.groups = [
        {
          group_id: "group-1",
          group_title: "Present tense",
          slots: [
            {
              slot_id: "slot-1-1",
              subjects: ["yo"],
              accepted_forms: ["habl`o`"],
              slot_note_markdown: "",
            },
            {
              slot_id: "slot-1-2",
              subjects: ["tu"],
              accepted_forms: ["habl`as`"],
              slot_note_markdown: "",
            },
          ],
        },
      ];
    }
    return next;
  };

  const openEditor = (exercise) => {
    const nextDraft = exercise
      ? normalizeDraft({
          ...exercise,
          options: exercise.options || [],
          option_feedback: exercise.option_feedback || [],
        })
      : normalizeDraft({
          lesson_id: selectedLessonId,
          type: "multiple_choice",
          title: "",
          question: "",
          prompt_image_url: "",
          options: ["Option 1", "Option 2"],
          option_feedback: ["", ""],
          picture_options: [
            { image_url: "", label: "Option 1" },
            { image_url: "", label: "Option 2" },
            { image_url: "", label: "Option 3" },
          ],
          vocab_cards: [
            { image_url: "", label: "Card 1", audio_url: "" },
            { image_url: "", label: "Card 2", audio_url: "" },
          ],
          correct_index: 0,
          tokens: ["Yo", "eres", "estudiante", "."],
          token_feedback: ["", "", "", ""],
          correction_sentence: "Yo **soy** estudiante.",
          correct_indices: [1],
          correct_options: [],
          correct_answer: "",
          correct_feedback: "",
          incorrect_feedback: "",
          hint: "",
          matching_pairs: [{ left: "", right: "", audio_url: "" }],
          explanation_content: "",
          custom_html: "",
          custom_css: "",
          custom_js: "",
          sentence_text: "",
          sentence_translation: "",
          audio_url: "",
          post_correct_audio_url: "",
          dialog_speakers: [
            { name: "Speaker 1", avatar_url: "" },
            { name: "Speaker 2", avatar_url: "" },
          ],
          dialog_lines: [
            { speaker_index: 0, text: "", translation: "", audio_url: "" },
          ],
          fill_blanks_sentence: "Yo {1} {2}.",
          fill_blanks_answers: ["Hola", "soy"],
          fill_blanks_decoys: ["tu", "es"],
          fill_blanks_feedback: ["", ""],
          fill_blanks_decoy_feedback: ["", ""],
          focus_sentence: "Yo {1} {2}.",
          focus_answers: ["soy", "estudiante"],
          focus_options: ["soy", "estudiante", "tu", "es"],
          word_order_words: ["Hola", "soy"],
          word_order_decoys: ["tu", "es"],
          intro_markdown: "",
          completion_message_markdown: "",
          pool_forms: ["habl`o`", "habl`as`", "habl`a`", "habl`amos`"],
          shuffle_pool: true,
          groups: [
            {
              group_id: "group-1",
              group_title: "Present tense",
              slots: [
                {
                  slot_id: "slot-1-1",
                  subjects: ["yo"],
                  accepted_forms: ["habl`o`"],
                  slot_note_markdown: "",
                },
              ],
            },
          ],
        });
    setEditingExercise(exercise || null);
    setDraft(nextDraft);
    setEditorMode("form");
    setJsonValue(JSON.stringify(nextDraft, null, 2));
    setJsonError("");
    setSaveError("");
    setPoolFormsText(joinList(nextDraft.pool_forms));
  };

  const closeEditor = () => {
    setEditingExercise(null);
    setDraft(null);
    setEditorMode("form");
    setJsonValue("");
    setJsonError("");
    setSaving(false);
    setSaveError("");
    setPoolFormsText("");
  };
  const handleSave = async (event) => {
    event.preventDefault();
    if (!draft) return;

    setSaveAttempt(`Saving... ${new Date().toISOString()}`);
    let payload = null;
    if (editorMode === "json") {
      try {
        payload = JSON.parse(jsonValue);
      } catch (err) {
        setJsonError("Invalid JSON.");
        return;
      }
    } else {
      payload = normalizeDraft(draft);
    }
    if (selectedLessonId) {
      payload.lesson_id = selectedLessonId;
    }
    if (!payload.lesson_id || !payload.type) {
      setSaveError("Save failed: missing lesson or content type.");
      return;
    }

    setSaving(true);
    setSaveError("");
    let updated = null;
    try {
      if (editingExercise) {
        const result = await updateExerciseWithError(editingExercise.id, payload);
        if (result.ok) {
          updated = result.data;
          setExercises((prev) =>
            prev.map((ex) => (ex.id === updated.id ? updated : ex))
          );
          setSaveAttempt(
            `Saved: ${updated.id} (lesson ${updated.lesson_id || "?"})`
          );
          closeEditor();
          return;
        }
        setSaveError(
          `Save failed (${result.status}): ${result.error || "Unknown error"}`
        );
      } else {
        const maxOrder = exercises.reduce(
          (acc, ex) => (typeof ex.order === "number" && ex.order > acc ? ex.order : acc),
          0
        );
        payload.order = maxOrder + 1;
        const result = await createExerciseWithError(payload);
        if (result.ok) {
          updated = result.data;
          setExercises((prev) => [...prev, updated]);
          setSaveAttempt(
            `Saved: ${updated.id} (lesson ${updated.lesson_id || "?"})`
          );
          closeEditor();
          return;
        }
        setSaveError(
          `Save failed (${result.status}): ${result.error || "Unknown error"}`
        );
      }
    } catch (err) {
      setSaveError(`Save failed: ${err?.message || "Unexpected error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = confirm("Delete this content? This cannot be undone.");
    if (!ok) return;
    const success = await deleteExercise(id);
    if (!success) return;
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const onDragStart = (event, exerciseId) => {
    const id = String(exerciseId || "");
    setDragExerciseId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const onDragEnd = () => {
    setDragExerciseId(null);
    setDragOverId(null);
  };

  const onDragOver = (event, exerciseId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const id = String(exerciseId || "");
    if (id !== dragOverId) {
      setDragOverId(id);
    }
  };

  const onDrop = async (event, exerciseId) => {
    event.preventDefault();
    const sourceId =
      dragExerciseId || event.dataTransfer.getData("text/plain") || null;
    setDragExerciseId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === exerciseId) return;

    const list = sortedExercises;
    const sourceIndex = list.findIndex(
      (ex) => String(ex.id || "") === String(sourceId)
    );
    const targetIndex = list.findIndex(
      (ex) => String(ex.id || "") === String(exerciseId)
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    const optimistic = next.map((ex, idx) => ({ ...ex, order: idx + 1 }));
    setExercises(optimistic);
    const updates = [];
    for (const ex of optimistic) {
      // Avoid parallel writes to the JSON store to prevent clobbering orders.
      const updated = await updateExercise(ex.id, { order: ex.order });
      if (!updated) {
        const refreshed = await listExercisesForLesson(selectedLessonId);
        setExercises(refreshed);
        return;
      }
      updates.push(updated);
    }
    setExercises(updates);
  };

  const handleCourseChange = (event) => {
    const nextId = event.target.value;
    setSelectedCourseId(nextId);
    const params = new URLSearchParams(location.search);
    params.set("courseId", nextId);
    params.delete("lessonId");
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const handleLessonChange = (event) => {
    const nextId = event.target.value;
    setSelectedLessonId(nextId);
    const params = new URLSearchParams(location.search);
    params.set("lessonId", nextId);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    setDraft((prev) => {
      const next = normalizeDraft({ ...prev, type: nextType });
      if (next.type === "conjugation_map") {
        setPoolFormsText(joinList(next.pool_forms));
      }
      return next;
    });
  };

  const handleTypeSelect = (value) => {
    setDraft((prev) => {
      const next = normalizeDraft({ ...prev, type: value });
      if (next.type === "conjugation_map") {
        setPoolFormsText(joinList(next.pool_forms));
      }
      return next;
    });
    setTypeMenuOpen(false);
  };

  const handleDraftChange = (field, value) => {
    setDraft((prev) => normalizeDraft({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, value) => {
    setDraft((prev) => {
      const nextOptions = [...(prev.options || [])];
      const nextFeedback = [...(prev.option_feedback || [])];
      const prevOption = nextOptions[index];
      nextOptions[index] = value;
      while (nextFeedback.length < nextOptions.length) nextFeedback.push("");
      const nextCorrect = [...(prev.correct_options || [])];
      const wasCorrect = nextCorrect.includes(prevOption);
      const filtered = nextCorrect.filter((item) => item !== prevOption);
      if (wasCorrect) filtered.push(value);
      return normalizeDraft({
        ...prev,
        options: nextOptions,
        option_feedback: nextFeedback,
        correct_options: filtered,
      });
    });
  };

  const handleFocusSentenceChange = (value) => {
    setDraft((prev) => {
      const expected = countPlaceholders(value);
      const nextAnswers = expected
        ? normalizeListLength(prev.focus_answers || [], expected)
        : prev.focus_answers || [];
      return normalizeDraft({
        ...prev,
        focus_sentence: value,
        focus_answers: nextAnswers,
      });
    });
  };

  const handleFocusAnswerChange = (index, value) => {
    setDraft((prev) => {
      const nextAnswers = [...(prev.focus_answers || [])];
      nextAnswers[index] = value;
      return normalizeDraft({ ...prev, focus_answers: nextAnswers });
    });
  };

  const handleFocusOptionChange = (index, value) => {
    setDraft((prev) => {
      const nextOptions = [...(prev.focus_options || [])];
      nextOptions[index] = value;
      return normalizeDraft({ ...prev, focus_options: nextOptions });
    });
  };

  const handleAddFocusOption = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        focus_options: [...(prev.focus_options || []), ""],
      })
    );
  };

  const handleRemoveFocusOption = (index) => {
    setDraft((prev) => {
      const nextOptions = [...(prev.focus_options || [])];
      nextOptions.splice(index, 1);
      return normalizeDraft({ ...prev, focus_options: nextOptions });
    });
  };

  const handleFeedbackChange = (index, value) => {
    setDraft((prev) => {
      const nextFeedback = [...(prev.option_feedback || [])];
      nextFeedback[index] = value;
      return normalizeDraft({ ...prev, option_feedback: nextFeedback });
    });
  };

  const handleAddOption = () => {
    setDraft((prev) => {
      const nextOptions = [...(prev.options || []), `Option ${prev.options.length + 1}`];
      const nextFeedback = [...(prev.option_feedback || []), ""];
      return normalizeDraft({
        ...prev,
        options: nextOptions,
        option_feedback: nextFeedback,
      });
    });
  };

  const handlePictureOptionChange = (index, field, value) => {
    setDraft((prev) => {
      const nextOptions = [...(prev.picture_options || [])];
      const nextFeedback = [...(prev.option_feedback || [])];
      nextOptions[index] = { ...(nextOptions[index] || {}), [field]: value };
      while (nextFeedback.length < nextOptions.length) nextFeedback.push("");
      return normalizeDraft({
        ...prev,
        picture_options: nextOptions,
        option_feedback: nextFeedback,
      });
    });
  };

  const handlePictureFeedbackChange = (index, value) => {
    setDraft((prev) => {
      const nextFeedback = [...(prev.option_feedback || [])];
      nextFeedback[index] = value;
      return normalizeDraft({ ...prev, option_feedback: nextFeedback });
    });
  };

  const handleAddPictureOption = () => {
    setDraft((prev) => {
      const nextOptions = [
        ...(prev.picture_options || []),
        { image_url: "", label: `Option ${prev.picture_options.length + 1}` },
      ];
      const nextFeedback = [...(prev.option_feedback || []), ""];
      return normalizeDraft({
        ...prev,
        picture_options: nextOptions,
        option_feedback: nextFeedback,
      });
    });
  };

  const handleRemovePictureOption = (index) => {
    setDraft((prev) => {
      const nextOptions = [...(prev.picture_options || [])];
      const nextFeedback = [...(prev.option_feedback || [])];
      nextOptions.splice(index, 1);
      nextFeedback.splice(index, 1);
      let nextCorrect = prev.correct_index ?? 0;
      if (index === nextCorrect) {
        nextCorrect = 0;
      } else if (index < nextCorrect) {
        nextCorrect -= 1;
      }
      let nextCorrectIndices = Array.isArray(prev.correct_indices)
        ? prev.correct_indices.map((value) => Number(value))
        : [];
      if (nextCorrectIndices.length > 0) {
        nextCorrectIndices = nextCorrectIndices
          .filter((value) => Number.isFinite(value))
          .filter((value) => value !== index)
          .map((value) => (value > index ? value - 1 : value));
        if (nextCorrectIndices.length === 0) {
          nextCorrectIndices = [0];
        }
      }
      return normalizeDraft({
        ...prev,
        picture_options: nextOptions,
        option_feedback: nextFeedback,
        correct_index: nextCorrect,
        correct_indices: nextCorrectIndices,
      });
    });
  };

  const handlePictureCorrectToggle = (index) => {
    setDraft((prev) => {
      const nextCorrect = new Set((prev.correct_indices || []).map(Number));
      if (nextCorrect.has(index)) {
        nextCorrect.delete(index);
      } else {
        nextCorrect.add(index);
      }
      const nextList = Array.from(nextCorrect).filter(
        (value) => Number.isFinite(value) && value >= 0
      );
      if (nextList.length === 0) {
        nextList.push(0);
      }
      return normalizeDraft({
        ...prev,
        correct_indices: nextList,
        correct_index: nextList[0] ?? 0,
      });
    });
  };

  const handleVocabCardChange = (index, field, value) => {
    setDraft((prev) => {
      const nextCards = [...(prev.vocab_cards || [])];
      nextCards[index] = { ...(nextCards[index] || {}), [field]: value };
      return normalizeDraft({ ...prev, vocab_cards: nextCards });
    });
  };

  const handleAddVocabCard = () => {
    setDraft((prev) => {
      const nextCards = [
        ...(prev.vocab_cards || []),
        { image_url: "", label: `Card ${prev.vocab_cards.length + 1}`, audio_url: "" },
      ];
      return normalizeDraft({ ...prev, vocab_cards: nextCards });
    });
  };

  const handleRemoveVocabCard = (index) => {
    setDraft((prev) => {
      const nextCards = [...(prev.vocab_cards || [])];
      nextCards.splice(index, 1);
      return normalizeDraft({ ...prev, vocab_cards: nextCards });
    });
  };

  const handleTokenChange = (index, value) => {
    setDraft((prev) => {
      const nextTokens = [...(prev.tokens || [])];
      const nextFeedback = [...(prev.token_feedback || [])];
      nextTokens[index] = value;
      while (nextFeedback.length < nextTokens.length) nextFeedback.push("");
      return normalizeDraft({
        ...prev,
        tokens: nextTokens,
        token_feedback: nextFeedback,
      });
    });
  };

  const handleTokenFeedbackChange = (index, value) => {
    setDraft((prev) => {
      const nextFeedback = [...(prev.token_feedback || [])];
      nextFeedback[index] = value;
      return normalizeDraft({ ...prev, token_feedback: nextFeedback });
    });
  };

  const handleAddToken = () => {
    setDraft((prev) => {
      const nextTokens = [...(prev.tokens || []), `Token ${prev.tokens.length + 1}`];
      const nextFeedback = [...(prev.token_feedback || []), ""];
      return normalizeDraft({
        ...prev,
        tokens: nextTokens,
        token_feedback: nextFeedback,
      });
    });
  };

  const handleMorphemeChange = (index, field, value) => {
    setDraft((prev) => {
      const nextPool = [...(prev.morpheme_pool || [])];
      nextPool[index] = { ...(nextPool[index] || {}), [field]: value };
      return normalizeDraft({ ...prev, morpheme_pool: nextPool });
    });
  };

  const handleAddMorpheme = () => {
    setDraft((prev) => {
      const nextPool = [
        ...(prev.morpheme_pool || []),
        { text: "", type: "root", label: "" },
      ];
      return normalizeDraft({ ...prev, morpheme_pool: nextPool });
    });
  };

  const handleRemoveMorpheme = (index) => {
    setDraft((prev) => {
      const nextPool = [...(prev.morpheme_pool || [])];
      nextPool.splice(index, 1);
      return normalizeDraft({ ...prev, morpheme_pool: nextPool });
    });
  };

  const handleCorrectSequenceChange = (index, value) => {
    setDraft((prev) => {
      const nextSequence = [...(prev.correct_sequence || [])];
      nextSequence[index] = value;
      return normalizeDraft({ ...prev, correct_sequence: nextSequence });
    });
  };

  const handleAddCorrectSequence = () => {
    setDraft((prev) => {
      const nextSequence = [...(prev.correct_sequence || []), ""];
      return normalizeDraft({ ...prev, correct_sequence: nextSequence });
    });
  };

  const handleRemoveCorrectSequence = (index) => {
    setDraft((prev) => {
      const nextSequence = [...(prev.correct_sequence || [])];
      nextSequence.splice(index, 1);
      return normalizeDraft({ ...prev, correct_sequence: nextSequence });
    });
  };

  const handleReorderItemChange = (index, value) => {
    setDraft((prev) => {
      const nextItems = [...(prev.items || [])];
      nextItems[index] = value;
      return normalizeDraft({ ...prev, items: nextItems });
    });
  };

  const handleAddReorderItem = () => {
    setDraft((prev) => {
      const nextItems = [
        ...(prev.items || []),
        `Step ${prev.items.length + 1}`,
      ];
      return normalizeDraft({ ...prev, items: nextItems });
    });
  };

  const handleRemoveReorderItem = (index) => {
    setDraft((prev) => {
      const nextItems = [...(prev.items || [])];
      nextItems.splice(index, 1);
      return normalizeDraft({ ...prev, items: nextItems });
    });
  };

  const handleRemoveToken = (index) => {
    setDraft((prev) => {
      const nextTokens = [...(prev.tokens || [])];
      const nextFeedback = [...(prev.token_feedback || [])];
      nextTokens.splice(index, 1);
      nextFeedback.splice(index, 1);
      const prevCorrect = Array.isArray(prev.correct_indices)
        ? prev.correct_indices
        : [];
      let nextCorrectIndices = prevCorrect
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      nextCorrectIndices = nextCorrectIndices
        .filter((value) => value !== index)
        .map((value) => (value > index ? value - 1 : value));
      if (nextCorrectIndices.length === 0) {
        nextCorrectIndices = [0];
      }
      const nextCorrect = nextCorrectIndices[0];
      return normalizeDraft({
        ...prev,
        tokens: nextTokens,
        token_feedback: nextFeedback,
        correct_index: nextCorrect,
        correct_indices: nextCorrectIndices,
      });
    });
  };

  const handleSelectAllCorrectToggle = (optionValue) => {
    setDraft((prev) => {
      const nextCorrect = new Set(prev.correct_options || []);
      if (nextCorrect.has(optionValue)) {
        nextCorrect.delete(optionValue);
      } else {
        nextCorrect.add(optionValue);
      }
      return normalizeDraft({
        ...prev,
        correct_options: Array.from(nextCorrect),
      });
    });
  };

  const handleRemoveOption = (index) => {
    setDraft((prev) => {
      const nextOptions = [...(prev.options || [])];
      const nextFeedback = [...(prev.option_feedback || [])];
      const removed = nextOptions[index];
      nextOptions.splice(index, 1);
      nextFeedback.splice(index, 1);
      const nextCorrect = (prev.correct_options || []).filter(
        (item) => item !== removed
      );
      return normalizeDraft({
        ...prev,
        options: nextOptions,
        option_feedback: nextFeedback,
        correct_options: nextCorrect,
      });
    });
  };

  const handlePairChange = (index, field, value) => {
    setDraft((prev) => {
      const nextPairs = [...(prev.matching_pairs || [])];
      nextPairs[index] = { ...nextPairs[index], [field]: value };
      return normalizeDraft({ ...prev, matching_pairs: nextPairs });
    });
  };

  const handleAddPair = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        matching_pairs: [
          ...(prev.matching_pairs || []),
          { left: "", right: "", audio_url: "" },
        ],
      })
    );
  };

  const handleRemovePair = (index) => {
    setDraft((prev) => {
      const nextPairs = [...(prev.matching_pairs || [])];
      nextPairs.splice(index, 1);
      return normalizeDraft({ ...prev, matching_pairs: nextPairs });
    });
  };


  const handleDialogSpeakerChange = (index, field, value) => {
    setDraft((prev) => {
      const nextSpeakers = [...(prev.dialog_speakers || [])];
      nextSpeakers[index] = { ...nextSpeakers[index], [field]: value };
      return normalizeDraft({ ...prev, dialog_speakers: nextSpeakers });
    });
  };

  const handleAddSpeaker = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        dialog_speakers: [
          ...(prev.dialog_speakers || []),
          { name: `Speaker ${prev.dialog_speakers.length + 1}`, avatar_url: "" },
        ],
      })
    );
  };

  const handleRemoveSpeaker = (index) => {
    setDraft((prev) => {
      const nextSpeakers = [...(prev.dialog_speakers || [])];
      nextSpeakers.splice(index, 1);
      const nextLines = [...(prev.dialog_lines || [])].map((line) => ({
        ...line,
        speaker_index:
          line.speaker_index != null && line.speaker_index > index
            ? line.speaker_index - 1
            : line.speaker_index || 0,
      }));
      return normalizeDraft({
        ...prev,
        dialog_speakers: nextSpeakers,
        dialog_lines: nextLines,
      });
    });
  };

  const handleDialogLineChange = (index, field, value) => {
    setDraft((prev) => {
      const nextLines = [...(prev.dialog_lines || [])];
      nextLines[index] = { ...nextLines[index], [field]: value };
      return normalizeDraft({ ...prev, dialog_lines: nextLines });
    });
  };

  const handleAddDialogLine = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        dialog_lines: [
          ...(prev.dialog_lines || []),
          { speaker_index: 0, text: "", translation: "", audio_url: "" },
        ],
      })
    );
  };

  const handleFillBlankAnswerChange = (index, value) => {
    setDraft((prev) => {
      const nextAnswers = [...(prev.fill_blanks_answers || [])];
      const nextFeedback = [...(prev.fill_blanks_feedback || [])];
      nextAnswers[index] = value;
      while (nextFeedback.length < nextAnswers.length) nextFeedback.push("");
      return normalizeDraft({
        ...prev,
        fill_blanks_answers: nextAnswers,
        fill_blanks_feedback: nextFeedback,
      });
    });
  };

  const uploadAudioFile = async (file, context, applyUrl) => {
    if (!file) return;
    setSaveAttempt(`Uploading audio... ${new Date().toISOString()}`);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedLessonId) {
        formData.append("lesson_id", selectedLessonId);
      }
      if (context) {
        formData.append("context", context);
      }
      const response = await fetch("/api/lessons-audio", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }
      const nextUrl = data.url || "";
      if (nextUrl) {
        applyUrl(nextUrl);
      }
      setSaveAttempt(`Uploaded audio: ${nextUrl || "ok"}`);
    } catch (err) {
      setSaveError(`Upload failed: ${err?.message || "Unexpected error"}`);
    }
  };

  const uploadImageFile = async (file, context, applyUrl) => {
    if (!file) return;
    setSaveAttempt(`Uploading image... ${new Date().toISOString()}`);
    setSaveError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedCourseId) {
        formData.append("course_id", selectedCourseId);
      }
      if (selectedLessonId) {
        formData.append("lesson_id", selectedLessonId);
      }
      if (context) {
        formData.append("context", context);
      }
      const response = await fetch("/api/lessons-images", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }
      const nextUrl = data.url || "";
      if (nextUrl) {
        applyUrl(nextUrl);
      }
      setSaveAttempt(`Uploaded image: ${nextUrl || "ok"}`);
    } catch (err) {
      setSaveError(`Upload failed: ${err?.message || "Unexpected error"}`);
    }
  };

  const handleFillBlankDecoyChange = (index, value) => {
    setDraft((prev) => {
      const nextDecoys = [...(prev.fill_blanks_decoys || [])];
      const nextFeedback = [...(prev.fill_blanks_decoy_feedback || [])];
      nextDecoys[index] = value;
      while (nextFeedback.length < nextDecoys.length) nextFeedback.push("");
      return normalizeDraft({
        ...prev,
        fill_blanks_decoys: nextDecoys,
        fill_blanks_decoy_feedback: nextFeedback,
      });
    });
  };

  const handleFillBlankAnswerFeedbackChange = (index, value) => {
    setDraft((prev) => {
      const nextFeedback = [...(prev.fill_blanks_feedback || [])];
      nextFeedback[index] = value;
      return normalizeDraft({ ...prev, fill_blanks_feedback: nextFeedback });
    });
  };

  const handleFillBlankDecoyFeedbackChange = (index, value) => {
    setDraft((prev) => {
      const nextFeedback = [...(prev.fill_blanks_decoy_feedback || [])];
      nextFeedback[index] = value;
      return normalizeDraft({ ...prev, fill_blanks_decoy_feedback: nextFeedback });
    });
  };

  const handleAddFillBlankAnswer = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        fill_blanks_answers: [...(prev.fill_blanks_answers || []), ""],
        fill_blanks_feedback: [...(prev.fill_blanks_feedback || []), ""],
      })
    );
  };

  const handleRemoveFillBlankAnswer = (index) => {
    setDraft((prev) => {
      const nextAnswers = [...(prev.fill_blanks_answers || [])];
      const nextFeedback = [...(prev.fill_blanks_feedback || [])];
      nextAnswers.splice(index, 1);
      nextFeedback.splice(index, 1);
      return normalizeDraft({
        ...prev,
        fill_blanks_answers: nextAnswers,
        fill_blanks_feedback: nextFeedback,
      });
    });
  };

  const handleAddFillBlankDecoy = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        fill_blanks_decoys: [...(prev.fill_blanks_decoys || []), ""],
        fill_blanks_decoy_feedback: [...(prev.fill_blanks_decoy_feedback || []), ""],
      })
    );
  };

  const handleRemoveFillBlankDecoy = (index) => {
    setDraft((prev) => {
      const nextDecoys = [...(prev.fill_blanks_decoys || [])];
      const nextFeedback = [...(prev.fill_blanks_decoy_feedback || [])];
      nextDecoys.splice(index, 1);
      nextFeedback.splice(index, 1);
      return normalizeDraft({
        ...prev,
        fill_blanks_decoys: nextDecoys,
        fill_blanks_decoy_feedback: nextFeedback,
      });
    });
  };
  const handleRemoveDialogLine = (index) => {
    setDraft((prev) => {
      const nextLines = [...(prev.dialog_lines || [])];
      nextLines.splice(index, 1);
      return normalizeDraft({ ...prev, dialog_lines: nextLines });
    });
  };

  const handleWordChange = (index, value) => {
    setDraft((prev) => {
      const nextWords = [...(prev.word_order_words || [])];
      nextWords[index] = value;
      return normalizeDraft({ ...prev, word_order_words: nextWords });
    });
  };

  const handleRemoveWord = (index) => {
    setDraft((prev) => {
      const nextWords = [...(prev.word_order_words || [])];
      nextWords.splice(index, 1);
      return normalizeDraft({ ...prev, word_order_words: nextWords });
    });
  };

  const handleAddWord = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        word_order_words: [...(prev.word_order_words || []), ""],
      })
    );
  };

  const handleDecoyChange = (index, value) => {
    setDraft((prev) => {
      const nextDecoys = [...(prev.word_order_decoys || [])];
      nextDecoys[index] = value;
      return normalizeDraft({ ...prev, word_order_decoys: nextDecoys });
    });
  };

  const handleRemoveDecoy = (index) => {
    setDraft((prev) => {
      const nextDecoys = [...(prev.word_order_decoys || [])];
      nextDecoys.splice(index, 1);
      return normalizeDraft({ ...prev, word_order_decoys: nextDecoys });
    });
  };

  const handleAddDecoy = () => {
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        word_order_decoys: [...(prev.word_order_decoys || []), ""],
      })
    );
  };

  const handlePoolFormsChange = (value) => {
    setPoolFormsText(value);
    setDraft((prev) =>
      normalizeDraft({
        ...prev,
        pool_forms: splitList(value),
      })
    );
  };

  const handleGroupFieldChange = (groupIndex, field, value) => {
    setDraft((prev) => {
      const nextGroups = [...(prev.groups || [])];
      nextGroups[groupIndex] = { ...nextGroups[groupIndex], [field]: value };
      return normalizeDraft({ ...prev, groups: nextGroups });
    });
  };

  const handleAddGroup = () => {
    setDraft((prev) => {
      const nextGroups = [...(prev.groups || [])];
      const nextIndex = nextGroups.length + 1;
      nextGroups.push({
        group_id: `group-${nextIndex}`,
        group_title: "",
        slots: [
          {
            slot_id: `slot-${nextIndex}-1`,
            subjects: [],
            accepted_forms: [],
            slot_note_markdown: "",
          },
        ],
      });
      return normalizeDraft({ ...prev, groups: nextGroups });
    });
  };

  const handleRemoveGroup = (groupIndex) => {
    setDraft((prev) => {
      const nextGroups = [...(prev.groups || [])];
      nextGroups.splice(groupIndex, 1);
      return normalizeDraft({ ...prev, groups: nextGroups });
    });
  };

  const handleSlotFieldChange = (groupIndex, slotIndex, field, value) => {
    setDraft((prev) => {
      const nextGroups = [...(prev.groups || [])];
      const group = nextGroups[groupIndex] || {};
      const slots = [...(group.slots || [])];
      const slot = { ...(slots[slotIndex] || {}) };
      if (field === "subjects" || field === "accepted_forms") {
        slot[field] = splitList(value);
      } else {
        slot[field] = value;
      }
      slots[slotIndex] = slot;
      nextGroups[groupIndex] = { ...group, slots };
      return normalizeDraft({ ...prev, groups: nextGroups });
    });
  };

  const handleAddSlot = (groupIndex) => {
    setDraft((prev) => {
      const nextGroups = [...(prev.groups || [])];
      const group = nextGroups[groupIndex] || {};
      const slots = [...(group.slots || [])];
      const nextIndex = slots.length + 1;
      slots.push({
        slot_id: `slot-${groupIndex + 1}-${nextIndex}`,
        subjects: [],
        accepted_forms: [],
        slot_note_markdown: "",
      });
      nextGroups[groupIndex] = { ...group, slots };
      return normalizeDraft({ ...prev, groups: nextGroups });
    });
  };

  const handleRemoveSlot = (groupIndex, slotIndex) => {
    setDraft((prev) => {
      const nextGroups = [...(prev.groups || [])];
      const group = nextGroups[groupIndex] || {};
      const slots = [...(group.slots || [])];
      slots.splice(slotIndex, 1);
      nextGroups[groupIndex] = { ...group, slots };
      return normalizeDraft({ ...prev, groups: nextGroups });
    });
  };

  const openJsonEditor = () => {
    if (!draft) return;
    setJsonValue(JSON.stringify(draft, null, 2));
    setJsonError("");
    setEditorMode("json");
  };

  const openFormEditor = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setDraft(normalizeDraft(parsed));
      setJsonError("");
      setEditorMode("form");
    } catch (err) {
      setJsonError("Invalid JSON.");
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/courses-admin/lessons?courseId=${selectedCourseId || ""}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            <span aria-hidden="true">&lt;</span> Back to Lessons
          </Link>
          <p className="mt-2 text-sm text-slate-500">{selectedCourse?.title}</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {selectedLesson?.title || "Lesson Content"}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => openEditor(null)}
          disabled={!selectedLessonId}
          className={cn(
            "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
            selectedLessonId ? "bg-[#475dd7] hover:brightness-95" : "bg-slate-300"
          )}
        >
          + Content
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Course</label>
          <select
            value={selectedCourseId}
            onChange={handleCourseChange}
            className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {courses.length === 0 ? (
              <option value="">No courses yet</option>
            ) : null}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Lesson</label>
          <select
            value={selectedLessonId}
            onChange={handleLessonChange}
            className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {lessons.length === 0 ? (
              <option value="">No lessons yet</option>
            ) : null}
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading content.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExercises.map((exercise, idx) => {
            const meta = exerciseMeta(exercise.type);
            const summary = (() => {
              if (exercise.type === "fill_blanks_select") {
                return exercise.fill_blanks_sentence || "Untitled content";
              }
                if (exercise.type === "explanation") {
                  return exercise.explanation_content || "Untitled content";
                }
                if (exercise.type === "custom_block") {
                  return exercise.custom_html || "Custom block";
                }
                if (exercise.type === "conjugation_map") {
                  return exercise.title || exercise.intro_markdown || "Untitled content";
                }
              return (
                exercise.question ||
                exercise.sentence_text ||
                  (exercise.word_order_words || []).join(" ") ||
                  exercise.explanation_content ||
                  exercise.custom_html ||
                  "Untitled content"
                );
              })();

            return (
              <div
                key={exercise.id}
                className={cn(
                  "group relative flex items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition",
                  "border-slate-200 hover:border-slate-300 hover:shadow-md"
                )}
                onDragOver={(event) => onDragOver(event, exercise.id)}
                onDrop={(event) => onDrop(event, exercise.id)}
              >
                {dragOverId === exercise.id ? (
                  <div className="absolute left-4 right-4 -top-1 h-1 rounded-full bg-indigo-400" />
                ) : null}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                      draggable
                      onDragStart={(event) => onDragStart(event, exercise.id)}
                      onDragEnd={onDragEnd}
                      onDragOver={(event) => onDragOver(event, exercise.id)}
                      onDrop={(event) => onDrop(event, exercise.id)}
                    >
                      <svg
                        aria-hidden="true"
                        width="10"
                        height="16"
                        viewBox="0 0 10 16"
                        fill="none"
                      >
                        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="2" r="1.5" fill="currentColor" />
                        <circle cx="2" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="2" cy="14" r="1.5" fill="currentColor" />
                        <circle cx="8" cy="14" r="1.5" fill="currentColor" />
                      </svg>
                    </div>
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold",
                        meta.iconClass
                      )}
                    >
                      {meta.icon ? (
                        <img
                          src={meta.icon}
                          alt=""
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      ) : (
                        <span>{meta.label.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          meta.badgeClass
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">#{idx + 1}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                      {summary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                      "border-transparent hover:border-slate-200 hover:bg-slate-50",
                      "cursor-pointer"
                    )}
                    onClick={() => openEditor(exercise)}
                    aria-label="Edit content"
                    title="Edit"
                  >
                    <img src={editIcon} alt="" className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                      "border-transparent hover:border-slate-200 hover:bg-slate-50",
                      "cursor-pointer"
                    )}
                    onClick={() => handleDelete(exercise.id)}
                    aria-label="Delete content"
                    title="Delete"
                  >
                    <img src={deleteIcon} alt="" className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}

          {sortedExercises.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              {selectedLessonId
                ? "No content yet. Click Content to add one."
                : "Select a lesson to view content."}
            </div>
          ) : null}
        </div>
      )}

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={closeEditor}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editingExercise ? "Edit Content" : "New Content"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedLesson?.title || "Lesson content"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {editorMode === "form" ? (
                  <button
                    type="button"
                    onClick={openJsonEditor}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    JSON Editor
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openFormEditor}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Form Editor
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Close"
                >
                  x
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-5">
              {saveAttempt ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                  Last save attempt: {saveAttempt}
                </div>
              ) : null}
              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}
              {editorMode === "json" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-900">JSON</label>
                    <button
                      type="button"
                      onClick={() => setJsonValue(JSON.stringify(draft, null, 2))}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Refresh JSON
                    </button>
                  </div>
                  <textarea
                    rows={16}
                    value={jsonValue}
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  {jsonError ? (
                    <p className="text-xs text-red-600">{jsonError}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    Use option_feedback for per-option feedback (multiple choice,
                    select all, dictation select).
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Content Type
                    </label>
                    <div className="relative" ref={typeMenuRef}>
                      <button
                        type="button"
                        onClick={() => setTypeMenuOpen((prev) => !prev)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm",
                          "focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg",
                              selectedTypeMeta.iconClass
                            )}
                          >
                            {selectedTypeMeta.icon ? (
                              <img
                                src={selectedTypeMeta.icon}
                                alt=""
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                            ) : null}
                          </span>
                          <span>{selectedTypeMeta.label}</span>
                        </span>
                        <span className="text-xs text-slate-400">▾</span>
                      </button>
                      {typeMenuOpen ? (
                        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                          {EXERCISE_TYPES.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => handleTypeSelect(type.value)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50",
                                draft.type === type.value && "bg-slate-50"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg",
                                  type.iconClass
                                )}
                              >
                                {type.icon ? (
                                  <img
                                    src={type.icon}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />
                                ) : null}
                              </span>
                              <span>{type.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      Choose the exercise type for this slide.
                    </p>
                  </div>

                  {draft.type !== "explanation" && draft.type !== "conjugation_map" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        {draft.type === "fill_blank"
                          ? "Sentence (use {1} for the blank)"
                          : "Question / Prompt"}
                      </label>
                      <textarea
                        rows={3}
                        value={draft.question}
                        onChange={(e) => handleDraftChange("question", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        {draft.type === "fill_blank"
                          ? "Use a single {1} to mark the blank (recommended). Additional placeholders are ignored. ___ is still supported. Markdown supported."
                          : "Use for instructions or a short explanation. Markdown supported."}
                      </p>
                    </div>
                  ) : null}

                  {draft.type !== "custom_block" ? (
                    <ImageUrlField
                      label="Prompt Image URL (optional)"
                      value={draft.prompt_image_url || ""}
                      onChange={(value) => handleDraftChange("prompt_image_url", value)}
                      helpText="Shown below the prompt text. Supports PNG, JPG, SVG, WEBP."
                      onUpload={(file) =>
                        uploadImageFile(file, `${draft.type}-prompt`, (url) =>
                          handleDraftChange("prompt_image_url", url)
                        )
                      }
                    />
                  ) : null}

                  {draft.type === "picture_choice" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Image Options
                      </label>
                      <p className="text-xs text-slate-500">
                        Add image choices with optional labels and feedback.
                      </p>
                      <div className="space-y-3">
                        {(draft.picture_options || []).map((option, index) => (
                          <div
                            key={`picture-option-${index}`}
                            className="rounded-xl border border-slate-200 p-3 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                value={option.label || ""}
                                onChange={(e) =>
                                  handlePictureOptionChange(
                                    index,
                                    "label",
                                    e.target.value
                                  )
                                }
                                placeholder="Label (optional)"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePictureOption(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove option"
                              >
                                x
                              </button>
                            </div>
                            <ImageUrlField
                              label="Image URL"
                              value={option.image_url || ""}
                              onChange={(value) =>
                                handlePictureOptionChange(index, "image_url", value)
                              }
                              helpText="Upload or paste an image URL (SVG supported)."
                              onUpload={(file) =>
                                uploadImageFile(file, `picture-choice-${index + 1}`, (url) =>
                                  handlePictureOptionChange(index, "image_url", url)
                                )
                              }
                            />
                            <input
                              value={(draft.option_feedback || [])[index] || ""}
                              onChange={(e) =>
                                handlePictureFeedbackChange(index, e.target.value)
                              }
                              placeholder="Feedback for this option (optional)"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPictureOption}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Option
                      </button>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Option
                        </label>
                        <select
                          value={draft.correct_index ?? 0}
                          onChange={(e) =>
                            handleDraftChange("correct_index", Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                          {(draft.picture_options || []).map((option, index) => (
                            <option key={`picture-correct-${index}`} value={index}>
                              {option.label?.trim()
                                ? option.label
                                : `Option ${index + 1}`}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">
                          Choose which image is the correct answer.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "picture-choice-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "picture_select_all" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Image Options
                      </label>
                      <p className="text-xs text-slate-500">
                        Add image choices and mark every correct option.
                      </p>
                      <div className="space-y-3">
                        {(draft.picture_options || []).map((option, index) => {
                          const isCorrect = (draft.correct_indices || []).includes(index);
                          return (
                            <div
                              key={`picture-multi-option-${index}`}
                              className="rounded-xl border border-slate-200 p-3 space-y-3"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  value={option.label || ""}
                                  onChange={(e) =>
                                    handlePictureOptionChange(
                                      index,
                                      "label",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Label (optional)"
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={isCorrect}
                                    onChange={() => handlePictureCorrectToggle(index)}
                                  />
                                  Correct
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePictureOption(index)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                  aria-label="Remove option"
                                >
                                  x
                                </button>
                              </div>
                              <ImageUrlField
                                label="Image URL"
                                value={option.image_url || ""}
                                onChange={(value) =>
                                  handlePictureOptionChange(index, "image_url", value)
                                }
                                helpText="Upload or paste an image URL (SVG supported)."
                                onUpload={(file) =>
                                  uploadImageFile(file, `picture-multi-${index + 1}`, (url) =>
                                    handlePictureOptionChange(index, "image_url", url)
                                  )
                                }
                              />
                              <input
                                value={(draft.option_feedback || [])[index] || ""}
                                onChange={(e) =>
                                  handlePictureFeedbackChange(index, e.target.value)
                                }
                                placeholder="Feedback for this option (optional)"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPictureOption}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Option
                      </button>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "picture-multi-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "vocab_cards" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Vocabulary Cards
                      </label>
                      <p className="text-xs text-slate-500">
                        Add image cards with a bold label and optional audio.
                      </p>
                      <div className="space-y-3">
                        {(draft.vocab_cards || []).map((card, index) => (
                          <div
                            key={`vocab-card-${index}`}
                            className="rounded-xl border border-slate-200 p-3 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                value={card.label || ""}
                                onChange={(e) =>
                                  handleVocabCardChange(index, "label", e.target.value)
                                }
                                placeholder="Label (Markdown supported)"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveVocabCard(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove card"
                              >
                                x
                              </button>
                            </div>
                            <ImageUrlField
                              label="Image URL"
                              value={card.image_url || ""}
                              onChange={(value) =>
                                handleVocabCardChange(index, "image_url", value)
                              }
                              helpText="Upload or paste an image URL (SVG supported)."
                              onUpload={(file) =>
                                uploadImageFile(file, `vocab-card-${index + 1}`, (url) =>
                                  handleVocabCardChange(index, "image_url", url)
                                )
                              }
                            />
                            <AudioUrlField
                              label="Audio URL (optional)"
                              value={card.audio_url || ""}
                              onChange={(value) =>
                                handleVocabCardChange(index, "audio_url", value)
                              }
                              helpText="Plays when learners tap the audio icon."
                              onUpload={(file) =>
                                uploadAudioFile(file, `vocab-card-${index + 1}`, (url) =>
                                  handleVocabCardChange(index, "audio_url", url)
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVocabCard}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Card
                      </button>
                    </div>
                  ) : null}

                  {draft.type === "error_spotting" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Sentence Tokens
                      </label>
                      <p className="text-xs text-slate-500">
                        Split the sentence into clickable tokens (words or punctuation).
                      </p>
                      <div className="space-y-3">
                        {(draft.tokens || []).map((token, index) => (
                          <div
                            key={`token-${index}`}
                            className="rounded-xl border border-slate-200 p-3 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                value={token || ""}
                                onChange={(e) => handleTokenChange(index, e.target.value)}
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveToken(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove token"
                              >
                                x
                              </button>
                            </div>
                            <input
                              value={(draft.token_feedback || [])[index] || ""}
                              onChange={(e) =>
                                handleTokenFeedbackChange(index, e.target.value)
                              }
                              placeholder="Feedback for this token (optional)"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddToken}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Token
                      </button>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Tokens
                        </label>
                        <div className="space-y-2">
                          {(draft.tokens || []).map((tokenValue, index) => (
                            <label
                              key={`token-correct-${index}`}
                              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={(draft.correct_indices || []).includes(index)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setDraft((prev) => {
                                    const current = Array.isArray(prev.correct_indices)
                                      ? prev.correct_indices
                                      : [];
                                    const next = checked
                                      ? [...current, index]
                                      : current.filter((value) => value !== index);
                                    return normalizeDraft({
                                      ...prev,
                                      correct_indices: next.length ? next : [index],
                                      correct_index: next.length ? next[0] : index,
                                    });
                                  });
                                }}
                              />
                              <span className="text-slate-700">
                                {tokenValue?.trim() ? tokenValue : `Token ${index + 1}`}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          Check every token that is incorrect.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Corrected Sentence (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={draft.correction_sentence || ""}
                          onChange={(e) =>
                            handleDraftChange("correction_sentence", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Show the corrected sentence after submission. Markdown supported.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "error-spotting-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "multiple_choice" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Answer Options
                      </label>
                      <p className="text-xs text-slate-500">
                        Each option can include optional feedback below it.
                      </p>
                      <div className="space-y-3">
                        {draft.options.map((option, index) => (
                          <div key={`option-${index}`} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove option"
                              >
                                x
                              </button>
                            </div>
                            <input
                              value={draft.option_feedback[index] || ""}
                              onChange={(e) => handleFeedbackChange(index, e.target.value)}
                              placeholder="Feedback for this option"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Option
                      </button>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Answer
                        </label>
                        <input
                          value={draft.correct_answer}
                          onChange={(e) => handleDraftChange("correct_answer", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Must match one of the options above.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "multiple-choice-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "fill_blank" || draft.type === "translation" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Correct Answer
                      </label>
                      <input
                        value={draft.correct_answer}
                        onChange={(e) => handleDraftChange("correct_answer", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        Exact match required (accents included).
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Feedback (optional)
                        </label>
                        <input
                          value={draft.correct_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after a correct answer. Markdown supported.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Feedback (optional)
                        </label>
                        <input
                          value={draft.incorrect_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("incorrect_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after an incorrect answer. Markdown supported.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, `${draft.type}-post`, (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "fill_blanks_select" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Sentence (use {"{1}"} {"{2}"} for blanks)
                        </label>
                        <textarea
                          rows={2}
                          value={draft.fill_blanks_sentence || ""}
                          onChange={(e) =>
                            handleDraftChange("fill_blanks_sentence", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Example: Yo {"{1}"} {"{2}"}.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Answers (in correct order)
                        </label>
                        <p className="text-xs text-slate-500">
                          These fill the numbered blanks in order.
                        </p>
                        <div className="space-y-2">
                          {(draft.fill_blanks_answers || []).map((answer, index) => (
                            <div key={`answer-${index}`} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-xs text-slate-400">
                                  {index + 1}.
                                </span>
                                <input
                                  value={answer}
                                  onChange={(e) =>
                                    handleFillBlankAnswerChange(index, e.target.value)
                                  }
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFillBlankAnswer(index)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                  aria-label="Remove answer"
                                >
                                  x
                                </button>
                              </div>
                              <input
                                value={draft.fill_blanks_feedback?.[index] || ""}
                                onChange={(e) =>
                                  handleFillBlankAnswerFeedbackChange(index, e.target.value)
                                }
                                placeholder={`Feedback for answer ${index + 1}`}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddFillBlankAnswer}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Answer
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Decoys (optional)
                        </label>
                        <p className="text-xs text-slate-500">
                          Extra words students can choose but are incorrect.
                        </p>
                        <div className="space-y-2">
                          {(draft.fill_blanks_decoys || []).map((decoy, index) => (
                            <div key={`decoy-${index}`} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  value={decoy}
                                  onChange={(e) =>
                                    handleFillBlankDecoyChange(index, e.target.value)
                                  }
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFillBlankDecoy(index)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                  aria-label="Remove decoy"
                                >
                                  x
                                </button>
                              </div>
                              <input
                                value={draft.fill_blanks_decoy_feedback?.[index] || ""}
                                onChange={(e) =>
                                  handleFillBlankDecoyFeedbackChange(index, e.target.value)
                                }
                                placeholder={`Feedback for decoy ${index + 1}`}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddFillBlankDecoy}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Decoy
                        </button>
                      </div>

                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "fill-blanks-select-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "matching" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Matching Pairs
                      </label>
                      <p className="text-xs text-slate-500">
                        Add each left/right pair. Audio is optional per pair.
                      </p>
                      <div className="space-y-3">
                        {draft.matching_pairs.map((pair, index) => (
                          <div key={`${index}-pair`} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                value={pair.left || ""}
                                onChange={(e) =>
                                  handlePairChange(index, "left", e.target.value)
                                }
                                placeholder="Left"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <input
                                value={pair.right || ""}
                                onChange={(e) =>
                                  handlePairChange(index, "right", e.target.value)
                                }
                                placeholder="Right"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePair(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove pair"
                              >
                                x
                              </button>
                            </div>
                            <AudioUrlField
                              label="Audio URL (optional)"
                              value={pair.audio_url || ""}
                              onChange={(value) =>
                                handlePairChange(index, "audio_url", value)
                              }
                              helpText="Plays after a correct match."
                              onUpload={(file) =>
                                uploadAudioFile(file, `matching-pair-${index + 1}`, (url) =>
                                  handlePairChange(index, "audio_url", url)
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPair}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Pair
                      </button>
                    </div>
                  ) : null}

                  {draft.type === "explanation" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Explanation
                      </label>
                      <textarea
                        rows={4}
                        value={draft.explanation_content || ""}
                        onChange={(e) =>
                          handleDraftChange("explanation_content", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                        <p className="text-xs text-slate-500">
                          Markdown supported: headings, lists, bold/italic, links, inline code.
                        </p>
                      </div>
                    ) : null}

                  {draft.type === "custom_block" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          HTML (required)
                        </label>
                        <textarea
                          rows={6}
                          value={draft.custom_html || ""}
                          onChange={(e) =>
                            handleDraftChange("custom_html", e.target.value)
                          }
                          placeholder="<div class=&quot;pp-card&quot;>...</div>"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Inline HTML only. Use existing ProfePanda utility classes where possible.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          CSS (optional)
                        </label>
                        <textarea
                          rows={4}
                          value={draft.custom_css || ""}
                          onChange={(e) =>
                            handleDraftChange("custom_css", e.target.value)
                          }
                          placeholder=".pp-card { ... }"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Scoped to this block. Keep it responsive (use max-width, flex, and relative units).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          JavaScript (optional)
                        </label>
                        <textarea
                          rows={5}
                          value={draft.custom_js || ""}
                          onChange={(e) =>
                            handleDraftChange("custom_js", e.target.value)
                          }
                          placeholder="document.querySelector(...)"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Inline JS only. Runs in a sandboxed iframe for safety.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {draft.type === "example_sentence" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Sentence (Markdown supported)
                        </label>
                        <textarea
                          rows={3}
                          value={draft.sentence_text || ""}
                          onChange={(e) =>
                            handleDraftChange("sentence_text", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Bold text renders in #475dd7.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Translation (optional)
                        </label>
                        <input
                          value={draft.sentence_translation || ""}
                          onChange={(e) =>
                            handleDraftChange(
                              "sentence_translation",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shown when the translation is toggled.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays when the learner taps the audio button."
                        onUpload={(file) =>
                          uploadAudioFile(file, "example-sentence", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "dialogue" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Speakers
                        </label>
                        <p className="text-xs text-slate-500">
                          Names shown in the dialogue header (avatars optional).
                        </p>
                        <div className="space-y-3">
                          {(draft.dialog_speakers || []).map((speaker, index) => (
                            <div
                              key={`speaker-${index}`}
                              className="rounded-xl border border-slate-200 p-3 space-y-3"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  value={speaker.name || ""}
                                  onChange={(e) =>
                                    handleDialogSpeakerChange(index, "name", e.target.value)
                                  }
                                  placeholder="Name"
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpeaker(index)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                  aria-label="Remove speaker"
                                >
                                  x
                                </button>
                              </div>
                              <ImageUrlField
                                label="Avatar URL (optional)"
                                value={speaker.avatar_url || ""}
                                onChange={(value) =>
                                  handleDialogSpeakerChange(index, "avatar_url", value)
                                }
                                helpText="Upload or paste a URL for the speaker avatar."
                                onUpload={(file) =>
                                  uploadImageFile(file, `dialogue-speaker-${index + 1}`, (url) =>
                                    handleDialogSpeakerChange(index, "avatar_url", url)
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSpeaker}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Speaker
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Dialogue Lines
                        </label>
                        <p className="text-xs text-slate-500">
                          Each line can include translation and audio.
                        </p>
                        <div className="space-y-3">
                          {(draft.dialog_lines || []).map((line, index) => (
                            <div
                              key={`line-${index}`}
                              className="rounded-xl border border-slate-200 p-3 space-y-2"
                            >
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-600">
                                  Speaker
                                </label>
                                <select
                                  value={line.speaker_index ?? 0}
                                  onChange={(e) =>
                                    handleDialogLineChange(
                                      index,
                                      "speaker_index",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                >
                                  {(draft.dialog_speakers || []).map((speaker, sIndex) => (
                                    <option key={`speaker-${sIndex}`} value={sIndex}>
                                      {speaker.name || `Speaker ${sIndex + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                rows={2}
                                value={line.text || ""}
                                onChange={(e) =>
                                  handleDialogLineChange(index, "text", e.target.value)
                                }
                                placeholder="Line text"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <input
                                value={line.translation || ""}
                                onChange={(e) =>
                                  handleDialogLineChange(
                                    index,
                                    "translation",
                                    e.target.value
                                  )
                                }
                                placeholder="Translation (optional)"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <AudioUrlField
                                label="Audio URL (optional)"
                                value={line.audio_url || ""}
                                onChange={(value) =>
                                  handleDialogLineChange(index, "audio_url", value)
                                }
                                helpText="Plays when this line is active."
                                onUpload={(file) =>
                                  uploadAudioFile(file, `dialogue-line-${index + 1}`, (url) =>
                                    handleDialogLineChange(index, "audio_url", url)
                                  )
                                }
                              />
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDialogLine(index)}
                                  className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Remove line
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddDialogLine}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Line
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {draft.type === "word_order" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Words in Correct Order
                        </label>
                        <p className="text-xs text-slate-500">
                          Enter each word/phrase that forms the sentence in order.
                        </p>
                        <div className="space-y-2">
                          {(draft.word_order_words || []).map((word, index) => (
                            <div key={`word-${index}`} className="flex items-center gap-2">
                              <span className="w-5 text-xs text-slate-400">{index + 1}.</span>
                              <input
                                value={word}
                                onChange={(e) => handleWordChange(index, e.target.value)}
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveWord(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove word"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddWord}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Word
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Decoy Words (optional)
                        </label>
                        <p className="text-xs text-slate-500">
                          Extra words that don&apos;t belong in the sentence.
                        </p>
                        <div className="space-y-2">
                          {(draft.word_order_decoys || []).map((word, index) => (
                            <div key={`decoy-${index}`} className="flex items-center gap-2">
                              <input
                                value={word}
                                onChange={(e) => handleDecoyChange(index, e.target.value)}
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveDecoy(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove decoy"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddDecoy}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Decoy
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Feedback (optional)
                        </label>
                        <input
                          value={draft.correct_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after the order is correct. Markdown supported.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Feedback (optional)
                        </label>
                        <input
                          value={draft.incorrect_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("incorrect_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows when the order is incorrect. Markdown supported.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "word-order-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "conjugation_map" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Title
                        </label>
                        <input
                          value={draft.title || ""}
                          onChange={(e) => handleDraftChange("title", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Short activity name shown at the top of the slide.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Intro Markdown (optional)
                        </label>
                        <textarea
                          rows={4}
                          value={draft.intro_markdown || ""}
                          onChange={(e) =>
                            handleDraftChange("intro_markdown", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Brief explanation. Supports markdown (bold, italics, lists).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Completion Message (optional)
                        </label>
                        <textarea
                          rows={3}
                          value={draft.completion_message_markdown || ""}
                          onChange={(e) =>
                            handleDraftChange(
                              "completion_message_markdown",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shown after all slots are correct.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Pool Forms
                        </label>
                        <textarea
                          rows={3}
                          value={poolFormsText}
                          onChange={(e) => handlePoolFormsChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Separate forms with commas or new lines. Use backticks to mark
                          the conjugation ending (e.g., habl`o`, habl`as`).
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.shuffle_pool !== false}
                          onChange={(e) =>
                            handleDraftChange("shuffle_pool", e.target.checked)
                          }
                        />
                        Shuffle pool forms
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-900">
                            Groups & Slots
                          </label>
                          <button
                            type="button"
                            onClick={handleAddGroup}
                            className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            + Add Group
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Groups create sections. Slots are the rows students complete.
                        </p>
                        {(draft.groups || []).map((group, groupIndex) => (
                          <div
                            key={group.group_id || `group-${groupIndex}`}
                            className="rounded-xl border border-slate-200 p-4 space-y-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={group.group_id || ""}
                                onChange={(e) =>
                                  handleGroupFieldChange(
                                    groupIndex,
                                    "group_id",
                                    e.target.value
                                  )
                                }
                                placeholder="Group ID"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <input
                                value={group.group_title || ""}
                                onChange={(e) =>
                                  handleGroupFieldChange(
                                    groupIndex,
                                    "group_title",
                                    e.target.value
                                  )
                                }
                                placeholder="Group title"
                                className="flex-[2] rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveGroup(groupIndex)}
                                className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(group.slots || []).map((slot, slotIndex) => (
                                <div
                                  key={slot.slot_id || `slot-${slotIndex}`}
                                  className="rounded-xl border border-slate-200 p-3 space-y-2"
                                >
                                  <div className="flex items-center gap-2">
                                  <input
                                    value={slot.slot_id || ""}
                                    onChange={(e) =>
                                      handleSlotFieldChange(
                                        groupIndex,
                                        slotIndex,
                                        "slot_id",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Slot ID"
                                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                  />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveSlot(groupIndex, slotIndex)
                                      }
                                      className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <input
                                    value={joinList(slot.subjects)}
                                    onChange={(e) =>
                                      handleSlotFieldChange(
                                        groupIndex,
                                        slotIndex,
                                        "subjects",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Subjects (comma separated)"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                  />
                                  <p className="text-xs text-slate-500">
                                    Subjects appear as pills on the left (e.g., yo, tu).
                                  </p>
                                  <textarea
                                    rows={2}
                                    value={joinList(slot.accepted_forms)}
                                    onChange={(e) =>
                                      handleSlotFieldChange(
                                        groupIndex,
                                        slotIndex,
                                        "accepted_forms",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Accepted forms (comma separated, with backticks)"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                  />
                                  <p className="text-xs text-slate-500">
                                    Correct forms for this subject. Use backticks on the
                                    ending (e.g., habl`o`).
                                  </p>
                                  <input
                                    value={slot.slot_note_markdown || ""}
                                    onChange={(e) =>
                                      handleSlotFieldChange(
                                        groupIndex,
                                        slotIndex,
                                        "slot_note_markdown",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Slot note (optional)"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                  />
                                  <p className="text-xs text-slate-500">
                                    Optional micro-hint for this row (inline markdown).
                                  </p>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddSlot(groupIndex)}
                              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              + Add Slot
                            </button>
                          </div>
                        ))}
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after each correct selection (after the correct sound)."
                        onUpload={(file) =>
                          uploadAudioFile(file, "conjugation-map-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "morphology_builder" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Morpheme Pool
                        </label>
                        <p className="text-xs text-slate-500">
                          Add prefixes, roots, and suffixes learners can select from.
                        </p>
                        <div className="space-y-2">
                          {(draft.morpheme_pool || []).map((item, index) => (
                            <div
                              key={`morpheme-${index}`}
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3"
                            >
                              <input
                                value={item.text || ""}
                                onChange={(e) =>
                                  handleMorphemeChange(index, "text", e.target.value)
                                }
                                placeholder="Morpheme text (e.g., re-, use, -able)"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <select
                                value={item.type || "root"}
                                onChange={(e) =>
                                  handleMorphemeChange(index, "type", e.target.value)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              >
                                <option value="prefix">Prefix</option>
                                <option value="root">Root</option>
                                <option value="suffix">Suffix</option>
                                <option value="other">Other</option>
                              </select>
                              {item.type === "other" ? (
                                <input
                                  value={item.label || ""}
                                  onChange={(e) =>
                                    handleMorphemeChange(index, "label", e.target.value)
                                  }
                                  placeholder="Other label (e.g., article)"
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleRemoveMorpheme(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove morpheme"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddMorpheme}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Morpheme
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Sequence
                        </label>
                        <p className="text-xs text-slate-500">
                          Enter the morphemes in the correct order to build the word.
                        </p>
                        <div className="space-y-2">
                          {(draft.correct_sequence || []).map((value, index) => (
                            <div key={`sequence-${index}`} className="flex items-center gap-2">
                              <span className="w-5 text-xs text-slate-400">
                                {index + 1}.
                              </span>
                              <input
                                value={value || ""}
                                onChange={(e) =>
                                  handleCorrectSequenceChange(index, e.target.value)
                                }
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveCorrectSequence(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove sequence item"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCorrectSequence}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Sequence Item
                        </button>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.shuffle_pool !== false}
                          onChange={(e) =>
                            handleDraftChange("shuffle_pool", e.target.checked)
                          }
                        />
                        Shuffle morpheme pool
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.show_hyphenation !== false}
                          onChange={(e) =>
                            handleDraftChange("show_hyphenation", e.target.checked)
                          }
                        />
                        Show hyphenation in the player
                      </label>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Feedback (optional)
                        </label>
                        <input
                          value={draft.correct_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after a correct build. Markdown supported.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Feedback (optional)
                        </label>
                        <input
                          value={draft.incorrect_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("incorrect_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows when the build is incorrect. Markdown supported.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "morphology-builder-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "dictation" ? (
                    <div className="space-y-4">
                      <AudioUrlField
                        label="Audio URL"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Prompt audio played for dictation."
                        onUpload={(file) =>
                          uploadAudioFile(file, "dictation-prompt", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Answer
                        </label>
                        <input
                          value={draft.correct_answer || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_answer", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Exact text students must type.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Feedback (optional)
                        </label>
                        <input
                          value={draft.correct_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after a correct answer. Markdown supported.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Feedback (optional)
                        </label>
                        <input
                          value={draft.incorrect_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("incorrect_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after an incorrect answer. Markdown supported.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {draft.type === "pronunciation_imitation" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Model Text (optional)
                        </label>
                        <input
                          value={draft.model_text || ""}
                          onChange={(e) =>
                            handleDraftChange("model_text", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Phrase students should imitate (Markdown supported).
                        </p>
                      </div>
                      <AudioUrlField
                        label="Model Audio URL"
                        value={draft.model_audio_url || ""}
                        onChange={(value) => handleDraftChange("model_audio_url", value)}
                        helpText="Primary audio students listen to and imitate."
                        onUpload={(file) =>
                          uploadAudioFile(file, "pronunciation-model", (url) =>
                            handleDraftChange("model_audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "reorder" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Items (correct order)
                        </label>
                        <p className="text-xs text-slate-500">
                          Enter items in the correct order. The player will shuffle
                          them for students to reorder.
                        </p>
                        <div className="space-y-2">
                          {(draft.items || []).map((item, index) => (
                            <div key={`reorder-item-${index}`} className="flex items-center gap-2">
                              <span className="w-5 text-xs text-slate-400">
                                {index + 1}.
                              </span>
                              <input
                                value={item || ""}
                                onChange={(e) =>
                                  handleReorderItemChange(index, e.target.value)
                                }
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveReorderItem(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                aria-label="Remove item"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddReorderItem}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Item
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Feedback (optional)
                        </label>
                        <input
                          value={draft.correct_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after a correct order. Markdown supported.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Feedback (optional)
                        </label>
                        <input
                          value={draft.incorrect_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("incorrect_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows when the order is incorrect. Markdown supported.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "reorder-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "conjugation_drill" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Answer
                        </label>
                        <input
                          value={draft.correct_answer || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_answer", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Exact conjugated form students must type.
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-900">
                            Stem (optional)
                          </label>
                          <input
                            value={draft.stem || ""}
                            onChange={(e) => handleDraftChange("stem", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          />
                          <p className="text-xs text-slate-500">
                            Shown plain in the correct answer preview.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-900">
                            Ending (optional)
                          </label>
                          <input
                            value={draft.ending || ""}
                            onChange={(e) =>
                              handleDraftChange("ending", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          />
                          <p className="text-xs text-slate-500">
                            Rendered underlined and blue in the correct answer.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Feedback (optional)
                        </label>
                        <input
                          value={draft.correct_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("correct_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after a correct answer. Markdown supported.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Incorrect Feedback (optional)
                        </label>
                        <input
                          value={draft.incorrect_feedback || ""}
                          onChange={(e) =>
                            handleDraftChange("incorrect_feedback", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Shows after an incorrect answer. Markdown supported.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "conjugation-drill-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "content_embed" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Embed URL
                        </label>
                        <input
                          value={draft.embed_url || ""}
                          onChange={(e) => handleDraftChange("embed_url", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Paste the embed or share URL (YouTube, Canva, Google Slides).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Embed HTML (optional)
                        </label>
                        <textarea
                          rows={4}
                          value={draft.embed_html || ""}
                          onChange={(e) => handleDraftChange("embed_html", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Paste the HTML iframe snippet (used instead of the URL when provided).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Embed Title (optional)
                        </label>
                        <input
                          value={draft.embed_title || ""}
                          onChange={(e) =>
                            handleDraftChange("embed_title", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Used for accessibility.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Aspect Ratio
                        </label>
                        <select
                          value={draft.embed_aspect_ratio || "16:9"}
                          onChange={(e) =>
                            handleDraftChange("embed_aspect_ratio", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="16:9">16:9 (widescreen)</option>
                          <option value="4:3">4:3 (slides)</option>
                          <option value="1:1">1:1 (square)</option>
                          <option value="9:16">9:16 (portrait)</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.embed_allow_fullscreen !== false}
                          onChange={(e) =>
                            handleDraftChange("embed_allow_fullscreen", e.target.checked)
                          }
                        />
                        Allow full screen
                      </label>
                    </div>
                  ) : null}

                  {draft.type === "dictation_select" ? (
                    <div className="space-y-4">
                      <AudioUrlField
                        label="Audio URL"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Prompt audio played for dictation select."
                        onUpload={(file) =>
                          uploadAudioFile(file, "dictation-select-prompt", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-900">
                          Answer Options
                        </label>
                        <p className="text-xs text-slate-500">
                          Learners click the correct word after hearing the audio.
                        </p>
                        <div className="space-y-3">
                          {draft.options.map((option, index) => (
                            <div key={`dictation-select-option-${index}`} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  value={option}
                                  onChange={(e) =>
                                    handleOptionChange(index, e.target.value)
                                  }
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                  aria-label="Remove option"
                                >
                                  x
                                </button>
                              </div>
                              <input
                                value={draft.option_feedback[index] || ""}
                                onChange={(e) => handleFeedbackChange(index, e.target.value)}
                                placeholder="Feedback for this option"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          + Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">
                          Correct Answer
                        </label>
                        <input
                          value={draft.correct_answer}
                          onChange={(e) => handleDraftChange("correct_answer", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                          Must match one of the options above.
                        </p>
                      </div>
                      <AudioUrlField
                        label="Post-correct Audio URL (optional)"
                        value={draft.post_correct_audio_url || ""}
                        onChange={(value) =>
                          handleDraftChange("post_correct_audio_url", value)
                        }
                        helpText="Plays after the correct answer sound."
                        onUpload={(file) =>
                          uploadAudioFile(file, "dictation-select-post", (url) =>
                            handleDraftChange("post_correct_audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {draft.type === "dictation_focus"
                    ? (() => {
                        const focusCount = Math.max(
                          countPlaceholders(draft.focus_sentence),
                          (draft.focus_answers || []).length || 0
                        );
                        const focusAnswers = normalizeListLength(
                          draft.focus_answers || [],
                          focusCount || 1
                        );
                        return (
                          <div className="space-y-4">
                            <AudioUrlField
                              label="Audio URL"
                              value={draft.audio_url || ""}
                              onChange={(value) => handleDraftChange("audio_url", value)}
                              helpText="Prompt audio played for dictation focus."
                              onUpload={(file) =>
                                uploadAudioFile(file, "dictation-focus-prompt", (url) =>
                                  handleDraftChange("audio_url", url)
                                )
                              }
                            />
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-slate-900">
                                Sentence (use {"{1}"}, {"{2}"} for blanks)
                              </label>
                              <textarea
                                rows={3}
                                value={draft.focus_sentence || ""}
                                onChange={(e) =>
                                  handleFocusSentenceChange(e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <p className="text-xs text-slate-500">
                                Use numbered placeholders to mark each blank.
                                Markdown supported outside the placeholders.
                              </p>
                            </div>
                            <div className="space-y-3">
                              <label className="text-sm font-semibold text-slate-900">
                                Correct Answers (in order)
                              </label>
                              <p className="text-xs text-slate-500">
                                One answer per blank, matching the numbered placeholders.
                              </p>
                              <div className="space-y-2">
                                {focusAnswers.map((answer, index) => (
                                  <div
                                    key={`dictation-focus-answer-${index}`}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="w-5 text-xs text-slate-400">
                                      {index + 1}.
                                    </span>
                                    <input
                                      value={answer}
                                      onChange={(e) =>
                                        handleFocusAnswerChange(
                                          index,
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <label className="text-sm font-semibold text-slate-900">
                                Option Pool (optional)
                              </label>
                              <p className="text-xs text-slate-500">
                                Optional clickable options to fill the blanks.
                                Leave empty to require typing.
                              </p>
                              <div className="space-y-2">
                                {(draft.focus_options || []).map((option, index) => (
                                  <div
                                    key={`dictation-focus-option-${index}`}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      value={option}
                                      onChange={(e) =>
                                        handleFocusOptionChange(
                                          index,
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFocusOption(index)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                      aria-label="Remove option"
                                    >
                                      x
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={handleAddFocusOption}
                                className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                + Add Option
                              </button>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-slate-900">
                                Correct Feedback (optional)
                              </label>
                              <input
                                value={draft.correct_feedback || ""}
                                onChange={(e) =>
                                  handleDraftChange("correct_feedback", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <p className="text-xs text-slate-500">
                                Shows after a correct answer. Markdown supported.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-slate-900">
                                Incorrect Feedback (optional)
                              </label>
                              <input
                                value={draft.incorrect_feedback || ""}
                                onChange={(e) =>
                                  handleDraftChange("incorrect_feedback", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                              <p className="text-xs text-slate-500">
                                Shows after an incorrect answer. Markdown supported.
                              </p>
                            </div>
                            <AudioUrlField
                              label="Post-correct Audio URL (optional)"
                              value={draft.post_correct_audio_url || ""}
                              onChange={(value) =>
                                handleDraftChange("post_correct_audio_url", value)
                              }
                              helpText="Plays after the correct answer sound."
                              onUpload={(file) =>
                                uploadAudioFile(file, "dictation-focus-post", (url) =>
                                  handleDraftChange("post_correct_audio_url", url)
                                )
                              }
                            />
                          </div>
                        );
                      })()
                    : null}

                  {draft.type === "select_all" ? (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900">
                        Answer Options
                      </label>
                      <p className="text-xs text-slate-500">
                        Mark every correct option; order does not matter.
                      </p>
                      <div className="space-y-3">
                        {draft.options.map((option, index) => {
                          const isCorrect = (draft.correct_options || []).includes(option);
                          return (
                            <div key={`option-${index}`} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  value={option}
                                  onChange={(e) => handleOptionChange(index, e.target.value)}
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={isCorrect}
                                    onChange={() => handleSelectAllCorrectToggle(option)}
                                  />
                                  Correct
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
                                  aria-label="Remove option"
                                >
                                  x
                                </button>
                              </div>
                              <input
                                value={draft.option_feedback[index] || ""}
                                onChange={(e) => handleFeedbackChange(index, e.target.value)}
                                placeholder="Feedback for this option"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        + Add Option
                      </button>
                      <AudioUrlField
                        label="Audio URL (optional)"
                        value={draft.audio_url || ""}
                        onChange={(value) => handleDraftChange("audio_url", value)}
                        helpText="Plays after a correct answer."
                        onUpload={(file) =>
                          uploadAudioFile(file, "select-all-post", (url) =>
                            handleDraftChange("audio_url", url)
                          )
                        }
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Hint (optional)
                    </label>
                    <input
                      value={draft.hint || ""}
                      onChange={(e) => handleDraftChange("hint", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                      Shown when students toggle hints on.
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-pointer",
                    saving ? "bg-slate-300" : "bg-[#475dd7] hover:brightness-95"
                  )}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
