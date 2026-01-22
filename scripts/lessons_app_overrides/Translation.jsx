import { useRef, useState } from "react";

import nextIcon from "../../assets/icons/lessons/next.svg";
import { playCorrectSoundThen, playIncorrectSound } from "../../utils/sound.js";
import PandaSprite from "./PandaSprite.jsx";
import PromptImage from "./PromptImage.jsx";

const LOWERCASE_CHARS = ["á", "é", "í", "ó", "ú", "ö", "ü", "ñ", "¿", "¡"];
const UPPERCASE_CHARS = ["Á", "É", "Í", "Ó", "Ú", "Ö", "Ü", "Ñ", "¿", "¡"];

function AccentButtons({ onInsert }) {
  const [uppercase, setUppercase] = useState(false);
  const chars = uppercase ? UPPERCASE_CHARS : LOWERCASE_CHARS;
  const toggleIcon = uppercase
    ? "/static/assets/icons/lowercase.svg"
    : "/static/assets/icons/uppercase.svg";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => setUppercase((prev) => !prev)}
        className="h-9 w-9 rounded-lg border border-slate-300 bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 cursor-pointer"
        title="Uppercase"
      >
        <img src={toggleIcon} alt="" className="h-4 w-4 mx-auto" aria-hidden="true" />
      </button>
      {chars.map((char) => (
        <button
          key={char}
          type="button"
          onClick={() => onInsert(char)}
          className="h-9 min-w-[2.25rem] rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
          title={char}
        >
          {char}
        </button>
      ))}
    </div>
  );
}

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


export default function Translation({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const [localAnswer, setLocalAnswer] = useState("");
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);
  const textareaRef = useRef(null);

  const answer = attempt ? attempt.answer : localAnswer;
  const submitted = attempt ? attempt.submitted : localSubmitted;

  const correctAnswer = (exercise?.correct_answer ?? "").trim();
  const normalizedUser = (answer ?? "").trim().toLowerCase();
  const normalizedCorrect = correctAnswer.toLowerCase();
  const isCorrect = normalizedUser === normalizedCorrect;
  const feedbackText = isCorrect
    ? exercise?.correct_feedback || ""
    : exercise?.incorrect_feedback || "";

  const setAnswer = (value) => {
    if (submitted) return;

    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), answer: value }));
    } else {
      setLocalAnswer(value);
    }
  };

  const insertChar = (char) => {
    if (submitted) return;
    const current = String(answer ?? "");
    const el = textareaRef.current;
    let start = current.length;
    let end = current.length;
    if (el && typeof el.selectionStart === "number") {
      start = el.selectionStart;
      end = el.selectionEnd;
    }
    const next = current.slice(0, start) + char + current.slice(end);
    setAnswer(next);
    requestAnimationFrame(() => {
      if (el) {
        const pos = start + char.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const handleCheck = () => {
    if (!String(answer ?? "").trim()) return;

    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), submitted: true }));
    } else {
      setLocalSubmitted(true);
    }
    if (isCorrect) {
      const audioUrl = exercise?.audio_url;
      if (audioUrl) {
        setAudioLocked(true);
      }
      playCorrectSoundThen(audioUrl).finally(() => {
        if (audioUrl) {
          setAudioLocked(false);
        }
      });
    } else {
      playIncorrectSound();
    }
  };

  const handleContinue = () => {
    onAnswer(isCorrect);
    // Keep attempt for review mode; Reset Lesson clears it.
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Translate this phrase</p>

      {showHint && exercise?.hint && (
        <div className="border rounded-xl p-3 bg-amber-50 text-amber-800">
          {renderInlineMarkdown(exercise.hint)}
        </div>
      )}

      <div className="border rounded-2xl p-6 text-left">
        <p className="text-base sm:text-xl font-normal text-slate-800">
          <span className="text-slate-400">"</span>
          {renderInlineMarkdown(exercise?.question ?? "Phrase to translate")}
          <span className="text-slate-400">"</span>
        </p>
      </div>
      <PromptImage src={exercise?.prompt_image_url} />

      <textarea
        ref={textareaRef}
        value={answer ?? ""}
        onChange={(e) => setAnswer(e.target.value)}
        className={[
          "w-full border rounded-xl p-3 min-h-[100px] font-medium",
          "focus:outline-none focus:ring-2 focus:ring-[#475dd7]/30",
          submitted
            ? isCorrect
              ? "border-[#80ac5f] bg-[#80ac5f]/10"
              : "border-red-400 bg-red-50"
            : String(answer ?? "").trim()
            ? "border-2 border-[#475dd7] bg-[#475dd7]/5"
            : "border-slate-200",
        ].join(" ")}
        placeholder="Type your translation..."
        disabled={submitted}
      />

      <AccentButtons onInsert={insertChar} />

      {!submitted ? (
        <button
          className="px-4 py-2 rounded-xl bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          disabled={!String(answer ?? "").trim()}
          onClick={handleCheck}
        >
          Check Answer
        </button>
      ) : (
        <div className="flex items-start gap-3">
          <PandaSprite variant={isCorrect ? "correct" : "incorrect"} />
          <div
            className={[
              "flex items-center justify-between gap-3 rounded-2xl border p-4 flex-1",
              isCorrect
                ? "border-[#80ac5f]/30 bg-[#80ac5f]/10"
                : "border-red-200 bg-red-50",
            ].join(" ")}
          >
            <div className="flex min-w-0 items-start gap-2 text-sm">
              <div className="min-w-0">
                <span
                  className={[
                    "block text-base sm:text-lg font-semibold",
                    isCorrect ? "text-[#2f5d22]" : "text-red-700",
                  ].join(" ")}
                >
                  {isCorrect ? "Correct." : `Incorrect. Expected: ${correctAnswer}`}
                </span>
                {feedbackText ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {renderInlineMarkdown(feedbackText)}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              title="Continue"
              aria-label="Continue"
              onClick={handleContinue}
              className={[
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
                audioLocked
                  ? "cursor-default opacity-60"
                  : "cursor-pointer hover:bg-black/5 hover:scale-105",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              ].join(" ")}
              disabled={audioLocked}
            >
              <img
                src={nextIcon}
                alt=""
                aria-hidden="true"
                className="h-10 w-10"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
