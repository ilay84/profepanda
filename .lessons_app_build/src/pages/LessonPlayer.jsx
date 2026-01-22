import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLessonById } from "../services/lessons.js";
import { listExercisesForLesson } from "../services/exercises.js";
import { markLessonComplete } from "../services/progress.js";
import { me } from "../services/auth.js";

import MultipleChoice from "../components/content/MultipleChoice.jsx";
import FillBlank from "../components/content/FillBlank.jsx";
import Translation from "../components/content/Translation.jsx";
import Matching from "../components/content/Matching.jsx";
import Explanation from "../components/content/Explanation.jsx";
import Dialogue from "../components/content/Dialogue.jsx";
import ExampleSentenceSlide from "../components/content/ExampleSentenceSlide.jsx";
import WordOrder from "../components/content/WordOrder.jsx";
import Reorder from "../components/content/Reorder.jsx";
import Dictation from "../components/content/Dictation.jsx";
import DictationSelect from "../components/content/DictationSelect.jsx";
import DictationFocus from "../components/content/DictationFocus.jsx";
import FillBlanksSelect from "../components/content/FillBlanksSelect.jsx";
import ConjugationMap from "../components/content/ConjugationMap.jsx";
import SelectAll from "../components/content/SelectAll.jsx";
import CustomBlock from "../components/content/CustomBlock.jsx";
import PictureChoice from "../components/content/PictureChoice.jsx";
import PictureSelectAll from "../components/content/PictureSelectAll.jsx";
import VocabCards from "../components/content/VocabCards.jsx";
import ErrorSpotting from "../components/content/ErrorSpotting.jsx";
import MorphologyBuilder from "../components/content/MorphologyBuilder.jsx";
import ConjugationDrill from "../components/content/ConjugationDrill.jsx";
import ContentEmbed from "../components/content/ContentEmbed.jsx";
import PronunciationImitation from "../components/content/PronunciationImitation.jsx";

import completionBadge from "../assets/icons/lessons/completion-badge.svg";
import backToLessonsIcon from "../assets/icons/lessons/back-to-lessons.svg";
import redoIcon from "../assets/icons/lessons/redo.svg";
import reviewIcon from "../assets/icons/lessons/review.svg";
import closeIcon from "../assets/icons/lessons/close.svg";
import hintIcon from "../assets/icons/lessons/hint.svg";

const LESSON_ATTEMPT_PREFIX = "pp_lesson_attempt_v1";

function renderInlineMarkdown(text) {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  const nodes = [];

  const renderWithBackticks = (content, keyPrefix, baseClassName = "text-slate-900") => {
    const parts = content.split(/(`[^`]+`)/g).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        const inner = part.slice(1, -1);
        return (
          <span key={`${keyPrefix}-tick-${index}`} className="font-semibold text-[#475dd7]">
            {inner}
          </span>
        );
      }
      return (
        <span key={`${keyPrefix}-txt-${index}`} className={baseClassName}>
          {part}
        </span>
      );
    });
  };

  const renderLine = (line, lineIndex) => {
    const parts = line
      .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
      .filter(Boolean);
    return (
      <span key={`md-line-${lineIndex}`}>
        {parts.map((part, index) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            const content = part.slice(1, -1);
            return (
              <span key={`md-${lineIndex}-${index}`} className="font-semibold text-[#475dd7]">
                {content}
              </span>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            const content = part.slice(2, -2);
            return (
              <span key={`md-${lineIndex}-${index}`} className="font-semibold text-slate-900">
                {renderWithBackticks(content, `md-b-${lineIndex}-${index}`)}
              </span>
            );
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            const content = part.slice(1, -1);
            return (
              <em key={`md-${lineIndex}-${index}`} className="text-slate-900">
                {renderWithBackticks(content, `md-i-${lineIndex}-${index}`)}
              </em>
            );
          }
          return (
            <span key={`md-${lineIndex}-${index}`} className="text-slate-900">
              {part}
            </span>
          );
        })}
      </span>
    );
  };

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`md-br-${index}`} />);
    }
    if (line.trim() === "---") {
      nodes.push(<hr key={`md-hr-${index}`} className="my-4 border-slate-200" />);
      return;
    }
    nodes.push(renderLine(line, index));
  });

  return nodes;
}


export default function LessonPlayer() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Used for per-user persistence
  const [userEmail, setUserEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Per-slide hint visibility (so toggling hint on one slide doesn't affect others)
  // Shape: { [exerciseId]: boolean }
  const [showHints, setShowHints] = useState({});

  // Per-exercise correctness for this run (used for summary scoring)
  // Shape: { [exerciseId]: boolean }
  const [results, setResults] = useState({});

  // Tracks slides the learner has viewed (used for content-slide completion)
  // Shape: { [exerciseId]: boolean }
  const [visited, setVisited] = useState({});

  // Per-exercise attempt state (review mode)
  // Example shape per exerciseId: { selected, submitted, answerText, ... }
  const [attempts, setAttempts] = useState({});
  const [postAudioLocked, setPostAudioLocked] = useState(false);
  const postAudioCount = useRef(0);

  const isGraded = useMemo(() => {
    return (e) =>
      e?.type === "multiple_choice" ||
      e?.type === "fill_blank" ||
      e?.type === "fill_blanks_select" ||
      e?.type === "translation" ||
      e?.type === "matching" ||
      e?.type === "word_order" ||
      e?.type === "reorder" ||
      e?.type === "dictation" ||
      e?.type === "dictation_select" ||
      e?.type === "dictation_focus" ||
      e?.type === "conjugation_map" ||
      e?.type === "conjugation_drill" ||
      e?.type === "morphology_builder" ||
      e?.type === "select_all" ||
      e?.type === "picture_choice" ||
      e?.type === "picture_select_all" ||
      e?.type === "error_spotting";
      // content_embed is not graded
  }, []);

  const storageKey = useMemo(() => {
    if (!lessonId) return "";
    const who = userEmail || "guest";
    return `${LESSON_ATTEMPT_PREFIX}::${who}::${lessonId}`;
  }, [userEmail, lessonId]);

  useEffect(() => {
    (async () => {
      setHydrated(false);

      const user = await me();
      const email = user?.email || "";
      setUserEmail(email);

      const lessonData = await getLessonById(lessonId);
      const exerciseData = await listExercisesForLesson(lessonId);

      setLesson(lessonData);
      setExercises(exerciseData);

      // Defaults (in case no saved state exists)
      let nextIndex = 0;
      let nextCompleted = false;
      let nextShowHints = {};
      let nextResults = {};
      let nextVisited = {};
      let nextAttempts = {};

      // Try to hydrate from localStorage
      try {
        const who = email || "guest";
        const key = `${LESSON_ATTEMPT_PREFIX}::${who}::${lessonId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === "object") {
            nextIndex = Number.isInteger(saved.index) ? saved.index : 0;
            nextCompleted = !!saved.completed;
            nextShowHints = saved.showHints && typeof saved.showHints === "object" ? saved.showHints : {};
            nextResults = saved.results && typeof saved.results === "object" ? saved.results : {};
            nextVisited = saved.visited && typeof saved.visited === "object" ? saved.visited : {};
            nextAttempts = saved.attempts && typeof saved.attempts === "object" ? saved.attempts : {};
          }
        }
      } catch {
        // Ignore hydration errors and fall back to defaults.
      }

      // Clamp index safely to loaded slides
      const maxIndex = Math.max(0, exerciseData.length - 1);
      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex > maxIndex) nextIndex = maxIndex;

      setIndex(nextIndex);
      setCompleted(nextCompleted);
      setShowHints(nextShowHints);
      setResults(nextResults);
      setVisited(nextVisited);
      setAttempts(nextAttempts);

      setHydrated(true);
    })();
  }, [lessonId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!storageKey) return;

    const payload = {
      index,
      completed,
      showHints,
      results,
      visited,
      attempts,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore persistence failures (e.g., storage quota)
    }
  }, [hydrated, storageKey, index, completed, showHints, results, visited, attempts]);

  useEffect(() => {
    if (!exercises.length) return;
    const current = exercises[index];
    if (!current?.id) return;

    setVisited((prev) => ({ ...prev, [current.id]: true }));
  }, [exercises, index]);

  useEffect(() => {
    const handleStart = () => {
      postAudioCount.current += 1;
      setPostAudioLocked(true);
    };
    const handleEnd = () => {
      postAudioCount.current = Math.max(0, postAudioCount.current - 1);
      if (postAudioCount.current === 0) {
        setPostAudioLocked(false);
      }
    };
    window.addEventListener("pp:postaudio-start", handleStart);
    window.addEventListener("pp:postaudio-end", handleEnd);
    return () => {
      window.removeEventListener("pp:postaudio-start", handleStart);
      window.removeEventListener("pp:postaudio-end", handleEnd);
    };
  }, []);

  useEffect(() => {
    if (!exercises.length) return;
    const currentExercise = exercises[index];
    if (!currentExercise?.id) return;
    if (!isGraded(currentExercise)) return;

    const attemptForExercise = attempts[currentExercise.id];
    if (!attemptForExercise?.submitted) return;

    let isCorrect = false;
    if (currentExercise.type === "multiple_choice") {
      const selectedIndex = attemptForExercise?.selected;
      const options = Array.isArray(currentExercise?.options) ? currentExercise.options : [];
      const selectedText =
        Number.isInteger(selectedIndex) && options[selectedIndex] != null
          ? String(options[selectedIndex]).trim()
          : String(attemptForExercise?.selected?.text ?? "").trim();
      const correctAnswer = (currentExercise?.correct_answer ?? "").trim();
      isCorrect = selectedText === correctAnswer;
    } else if (
      currentExercise.type === "fill_blank" ||
      currentExercise.type === "translation"
    ) {
      const user = String(attemptForExercise?.answer ?? "").trim().toLowerCase();
      const correct = String(currentExercise?.correct_answer ?? "").trim().toLowerCase();
      isCorrect = user === correct;
    } else if (currentExercise.type === "picture_choice") {
      const selectedIndex = attemptForExercise?.selected;
      const correctIndex =
        typeof currentExercise?.correct_index === "number"
          ? currentExercise.correct_index
          : -1;
      isCorrect = selectedIndex === correctIndex;
    } else if (currentExercise.type === "error_spotting") {
      const selected = Array.isArray(attemptForExercise?.selected)
        ? attemptForExercise.selected
        : [];
      const incorrectIndices = Array.isArray(currentExercise?.correct_indices)
        ? currentExercise.correct_indices.map((value) => Number(value)).filter(Number.isFinite)
        : Number.isFinite(currentExercise?.correct_index)
        ? [Number(currentExercise.correct_index)]
        : [];
      const selectedSet = new Set(selected);
      const incorrectSet = new Set(incorrectIndices);
      isCorrect =
        selectedSet.size === incorrectSet.size &&
        [...incorrectSet].every((value) => selectedSet.has(value));
    } else if (currentExercise.type === "select_all") {
      const selected = Array.isArray(attemptForExercise?.selected)
        ? attemptForExercise.selected
        : [];
      const correctOptions = Array.isArray(currentExercise?.correct_options)
        ? currentExercise.correct_options.map((value) => String(value).trim())
        : [];
      const selectedSet = new Set(selected.map((value) => String(value).trim()));
      const correctSet = new Set(correctOptions);
      isCorrect =
        selectedSet.size === correctSet.size &&
        [...correctSet].every((value) => selectedSet.has(value));
    } else if (currentExercise.type === "picture_select_all") {
      const selected = Array.isArray(attemptForExercise?.selected)
        ? attemptForExercise.selected
        : [];
      const correctIndices = Array.isArray(currentExercise?.correct_indices)
        ? currentExercise.correct_indices.map((value) => Number(value)).filter(Number.isFinite)
        : Number.isFinite(currentExercise?.correct_index)
        ? [Number(currentExercise.correct_index)]
        : [];
      const selectedSet = new Set(selected);
      const correctSet = new Set(correctIndices);
      isCorrect =
        correctSet.size > 0 &&
        selectedSet.size === correctSet.size &&
        [...correctSet].every((value) => selectedSet.has(value));
    } else if (currentExercise.type === "matching") {
      isCorrect = !!attemptForExercise?.completed || !!attemptForExercise?.isCorrect;
    } else if (currentExercise.type === "fill_blanks_select") {
      isCorrect = !!attemptForExercise?.isCorrect;
    } else if (currentExercise.type === "morphology_builder") {
      isCorrect = !!attemptForExercise?.isCorrect;
    }

    setResults((prev) => {
      if (prev[currentExercise.id] === isCorrect) return prev;
      return { ...prev, [currentExercise.id]: isCorrect };
    });
  }, [attempts, exercises, index, isGraded]);

  if (!lesson) {
    return <div className="p-6">Lesson not found.</div>;
  }

  if (exercises.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <p>No exercises yet.</p>
      </div>
    );
  }

  const exercise = exercises[index];
  const showHint = !!showHints[exercise.id];

  const clearSavedAttempt = () => {
    try {
      if (storageKey) localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const handleAnswer = async (isCorrect) => {
    setResults((prev) => {
      const nextResults = { ...prev, [exercise.id]: !!isCorrect };
      return nextResults;
    });

    const isLast = index >= exercises.length - 1;

    if (!isLast) {
      setIndex(index + 1);
      return;
    }

    const graded = exercises.filter(isGraded);
    const total = graded.length;

    const correct = graded.reduce((acc, e) => {
      if (e.id === exercise.id) return acc + (isCorrect ? 1 : 0);
      return acc + (results[e.id] ? 1 : 0);
    }, 0);

    const percent = total === 0 ? 100 : Math.round((correct / total) * 100);

    if (percent === 100) {
      const user = await me();
      if (user?.email && lesson?.course_id && lesson?.id) {
        await markLessonComplete({
          userEmail: user.email,
          courseId: lesson.course_id,
          lessonId: lesson.id,
          xpReward: lesson.xp_reward ?? 0,
        });
      }
    }

    setCompleted(true);
  };

    const ExerciseComponent = {
      explanation: Explanation,
      custom_block: CustomBlock,
      content_embed: ContentEmbed,
      picture_choice: PictureChoice,
      picture_select_all: PictureSelectAll,
      vocab_cards: VocabCards,
      error_spotting: ErrorSpotting,
      multiple_choice: MultipleChoice,
    fill_blank: FillBlank,
    translation: Translation,
    matching: Matching,
    dialogue: Dialogue,
    example_sentence: ExampleSentenceSlide,
    word_order: WordOrder,
    reorder: Reorder,
    dictation: Dictation,
    dictation_select: DictationSelect,
    dictation_focus: DictationFocus,
    fill_blanks_select: FillBlanksSelect,
    conjugation_map: ConjugationMap,
    conjugation_drill: ConjugationDrill,
    morphology_builder: MorphologyBuilder,
    pronunciation_imitation: PronunciationImitation,
    select_all: SelectAll,
  }[exercise.type] || MultipleChoice;

  // Only MultipleChoice/FillBlank/Translation get review-mode attempts in this step.
  const attempt = attempts[exercise.id];
  const setAttempt = (updater) => {
    setAttempts((prev) => {
      const nextVal = typeof updater === "function" ? updater(prev[exercise.id]) : updater;
      return { ...prev, [exercise.id]: nextVal };
    });
  };

  const closeButton = lesson?.course_id ? (
    <Link
      to={`/courses/${lesson.course_id}`}
      className="fixed right-6 top-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-800 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 cursor-pointer"
      title="Close lesson"
      aria-label="Close lesson"
    >
      <img src={closeIcon} alt="" className="h-7 w-7" aria-hidden="true" />
    </Link>
  ) : null;

  if (completed) {
    const graded = exercises.filter(isGraded);
    const total = graded.length;
    const correct = graded.reduce((acc, e) => acc + (results[e.id] ? 1 : 0), 0);
    const percent = total === 0 ? 100 : Math.round((correct / total) * 100);

    const firstMissedIndex = exercises.findIndex(
      (e) => isGraded(e) && results[e.id] !== true
    );
    const reviewIndex = firstMissedIndex === -1 ? 0 : firstMissedIndex;

    const mastered = percent === 100;

    const masteredPillClassName =
      "inline-flex items-center rounded-full bg-[#80ac5f] px-2 py-0.5 text-xs font-semibold text-white shadow-sm";

    const masteredPillToneClassName = "";

    return (
      <div className="min-h-screen bg-slate-50 p-6">
        {closeButton}
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {mastered ? "Lesson mastered" : "Lesson finished"}
            </h1>

            <p className="text-slate-600">
              {mastered ? (
                <>
                  You mastered "
                  <span className="font-medium text-slate-800">
                    {renderInlineMarkdown(lesson.title)}
                  </span>
                  ".
                </>
              ) : (
                <>
                  You finished "
                  <span className="font-medium text-slate-800">
                    {renderInlineMarkdown(lesson.title)}
                  </span>
                  ". Want to master it?
                </>
              )}
            </p>
          </div>

          <div
            className={[
              "rounded-2xl border bg-white p-6 shadow-sm",
              mastered ? "border-emerald-200" : "border-slate-200",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">Your score</p>
                <p className={["text-5xl font-extrabold tracking-tight", mastered ? "text-emerald-700" : "text-slate-900"].join(" ")}>
                  {percent}%
                </p>
                {mastered ? (
                  <span className={masteredPillClassName}>
                    Mastered
                  </span>
                ) : (
                  <p className="text-sm text-slate-600">
                    To mark this lesson as mastered (and earn credit), redo it and aim for 100%.
                  </p>
                )}
              </div>

              {mastered ? (
                <div className="flex h-full items-center justify-center">
                  <img
                    src={completionBadge}
                    alt="Completion badge"
                    className="h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32"
                  />
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lesson?.course_id && (
              <Link
                to={`/courses/${lesson.course_id}`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                <img
                  src={backToLessonsIcon}
                  alt=""
                  className="mr-2 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Back to lessons
              </Link>
            )}

            <button
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 cursor-pointer"
              onClick={() => {
                setIndex(reviewIndex);
                setCompleted(false);
              }}
            >
              <img
                src={reviewIcon}
                alt=""
                className="mr-2 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              Review answers
            </button>

            <button
              className="inline-flex items-center justify-center rounded-xl bg-[#d25c7f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#c04f70] cursor-pointer"
              onClick={() => {
                clearSavedAttempt();
                setIndex(0);
                setCompleted(false);
                setShowHints({});
                setResults({});
                setVisited({});
                setAttempts({});
              }}
            >
              <img
                src={redoIcon}
                alt=""
                className="mr-2 h-4 w-4 shrink-0 invert brightness-0"
                aria-hidden="true"
              />
              Redo lesson
            </button>
          </div>
        </div>
      </div>
    );
  }

  const graded = exercises.filter(isGraded);
  const gradedIndex = exercises.slice(0, index + 1).filter(isGraded).length;

  const nextLocked =
    isGraded(exercise) &&
    index < exercises.length - 1 &&
    results[exercise.id] === undefined;

  const nextDisabled = (() => {
    if (index >= exercises.length - 1) return true;
    if (postAudioLocked) return true;
    if (!isGraded(exercise)) return false;

    // Allow Next once the exercise has been submitted (even if result not recorded yet)
    if (attempt?.submitted) return false;

    return results[exercise.id] === undefined;
  })();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {closeButton}
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {exercises.map((s, i) => {
                const isCurrent = i === index;

              let notchClass = "bg-slate-300";

              if (isGraded(s)) {
                if (results[s.id] === true) {
                  notchClass = "bg-blue-600";
                } else if (results[s.id] === false) {
                  notchClass = "bg-amber-400";
                }
              } else if (visited[s.id] === true) {
                notchClass = "bg-blue-600";
              }

              const isAmberClickable = isGraded(s) && results[s.id] === false;

                return (
                  <button
                    key={s.id || i}
                    type="button"
                    onClick={() => {
                      if (!isAmberClickable) return;
                      setIndex(i);
                    }}
                    className={[
                      "h-2 w-2 rounded-full",
                      notchClass,
                      isCurrent ? "ring-2 ring-slate-300 ring-offset-2 ring-offset-slate-50" : "",
                      isAmberClickable ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                    title={isAmberClickable ? `Review: slide ${i + 1}` : `Slide ${i + 1}`}
                    aria-label={isAmberClickable ? `Review slide ${i + 1}` : `Slide ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-800">
            {renderInlineMarkdown(lesson.title)}
          </h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            {(() => {
              const hintText = String(exercise?.hint ?? "").trim();
              const hasHint =
                hintText.length > 0 &&
                hintText.toLowerCase() !== "undefined" &&
                hintText.toLowerCase() !== "null";

              return hasHint ? (
                  <button
                    type="button"
                    className={[
                      "inline-flex items-center justify-center h-8 w-8 rounded-full border shadow-sm transition",
                      "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                      "cursor-pointer",
                    ].join(" ")}
                    onClick={() => {
                      setShowHints((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }));
                    }}
                    aria-pressed={showHint}
                    title={showHint ? "Hide hint" : "Show hint"}
                    aria-label={showHint ? "Hide hint" : "Show hint"}
                  >
                    <img src={hintIcon} alt="" aria-hidden="true" className="h-4 w-4" />
                  </button>
              ) : (
                <div />
              );
            })()}

            <div />
          </div>

          <div className="mt-4">
            <ExerciseComponent
              key={exercise.id}
              exercise={exercise}
              onAnswer={handleAnswer}
              showHint={showHint}
              attempt={
                exercise.type === "multiple_choice" ||
                exercise.type === "fill_blank" ||
                exercise.type === "translation" ||
                exercise.type === "picture_choice" ||
                exercise.type === "error_spotting" ||
                exercise.type === "matching" ||
                exercise.type === "fill_blanks_select" ||
                exercise.type === "morphology_builder" ||
                exercise.type === "select_all" ||
                exercise.type === "picture_select_all"
                  ? attempt
                  : undefined
              }
              setAttempt={
                exercise.type === "multiple_choice" ||
                exercise.type === "fill_blank" ||
                exercise.type === "translation" ||
                exercise.type === "picture_choice" ||
                exercise.type === "error_spotting" ||
                exercise.type === "matching" ||
                exercise.type === "fill_blanks_select" ||
                exercise.type === "morphology_builder" ||
                exercise.type === "select_all" ||
                exercise.type === "picture_select_all"
                  ? setAttempt
                  : undefined
              }
            />
          </div>
        </div>

        <div className="border-t border-slate-200/70 pt-3 sm:pt-4 md:sticky md:bottom-0 md:z-10 md:bg-slate-50 md:pb-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={[
                "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
                index === 0
                  ? "border-slate-200 bg-white text-slate-400 cursor-default"
                  : "border-slate-200 bg-white text-slate-800 cursor-pointer hover:bg-slate-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
              ].join(" ")}
              onClick={() => {
                if (index === 0) return;
                setIndex(index - 1);
              }}
              disabled={index === 0}
            >
              Back
            </button>

            <p className="text-sm font-medium text-slate-500">
              {index + 1} of {exercises.length}
            </p>

            <button
              type="button"
              className={[
                "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
                nextDisabled
                  ? "border-slate-200 bg-white text-slate-400 cursor-default"
                  : "border-slate-200 bg-white text-slate-800 cursor-pointer hover:bg-slate-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
              ].join(" ")}
              onClick={() => {
                if (index >= exercises.length - 1) return;
                if (postAudioLocked) return;

                if (isGraded(exercise) && results[exercise.id] === undefined) {
                  if (!attempt?.submitted) return;

                  let isCorrect = false;

                  if (exercise.type === "multiple_choice") {
                    const selectedText = (attempt?.selected?.text ?? "").trim();
                    const correctAnswer = (exercise?.correct_answer ?? "").trim();
                    isCorrect = selectedText === correctAnswer;
                  } else if (exercise.type === "fill_blank" || exercise.type === "translation") {
                    const user = String(attempt?.answer ?? "").trim().toLowerCase();
                    const correct = String(exercise?.correct_answer ?? "").trim().toLowerCase();
                    isCorrect = user === correct;
                  } else if (exercise.type === "matching") {
                    // Matching calls onAnswer(true) when completed, so normally results is already set.
                    // Keep safe default.
                    isCorrect = true;
                  } else if (exercise.type === "fill_blanks_select") {
                    isCorrect = !!attempt?.isCorrect;
                  } else if (exercise.type === "morphology_builder") {
                    isCorrect = !!attempt?.isCorrect;
                  }

                  handleAnswer(isCorrect);
                  return;
                }

                setIndex(index + 1);
              }}
              disabled={nextDisabled}
            >
              Next
            </button>
          </div>
        </div>

        {nextLocked && (
          <p className="text-sm text-slate-500">Submit an answer to continue.</p>
        )}

        <button
          className="text-sm text-slate-700 underline hover:text-slate-900 cursor-pointer"
          onClick={() => {
            clearSavedAttempt();
            setIndex(0);
            setCompleted(false);
            setShowHints({});
            setResults({});
            setVisited({});
            setAttempts({});
          }}
        >
          Reset lesson
        </button>
      </div>
    </div>
  );
}
