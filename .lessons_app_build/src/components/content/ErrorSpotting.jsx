import { useMemo, useState } from "react";

import nextIcon from "../../assets/icons/lessons/next.svg";
import { playCorrectSoundThen, playIncorrectSound } from "../../utils/sound.js";
import PandaSprite from "./PandaSprite.jsx";
import PromptImage from "./PromptImage.jsx";

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


export default function ErrorSpotting({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const [localSelected, setLocalSelected] = useState([]);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);

  const selected = attempt ? attempt.selected : localSelected;
  const submitted = attempt ? attempt.submitted : localSubmitted;

  const tokens = Array.isArray(exercise?.tokens) ? exercise.tokens : [];
  const incorrectIndices = useMemo(() => {
    if (Array.isArray(exercise?.correct_indices) && exercise.correct_indices.length) {
      return exercise.correct_indices.map((value) => Number(value)).filter(Number.isFinite);
    }
    if (Number.isFinite(exercise?.correct_index)) {
      return [Number(exercise.correct_index)];
    }
    return [];
  }, [exercise?.correct_indices, exercise?.correct_index]);
  const selectedSet = new Set(selected);
  const incorrectSet = new Set(incorrectIndices);
  const isCorrect =
    selectedSet.size === incorrectSet.size &&
    [...incorrectSet].every((value) => selectedSet.has(value));
  const tokenFeedback = exercise?.token_feedback ?? [];

  const feedback = useMemo(() => {
    if (!submitted) return "";
    if (isCorrect) return exercise?.correct_feedback || "Correct.";
    return exercise?.incorrect_feedback || "Incorrect.";
  }, [submitted, isCorrect, exercise?.correct_feedback, exercise?.incorrect_feedback]);

  const setSelected = (index) => {
    if (submitted) return;
    const update = (prevSelected) => {
      const current = Array.isArray(prevSelected) ? prevSelected : [];
      if (current.includes(index)) {
        return current.filter((value) => value !== index);
      }
      return [...current, index];
    };
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), selected: update(prev?.selected) }));
    } else {
      setLocalSelected((prev) => update(prev));
    }
  };

  const handleCheck = () => {
    if (!selected || selected.length === 0) return;
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
  };

  return (
    <div className="space-y-4">
      {exercise?.question ? (
        <h2 className="text-xl font-normal text-slate-800">
          {renderInlineMarkdown(exercise.question)}
        </h2>
      ) : null}
      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint && (
        <div className="border rounded-xl p-3 bg-amber-50 text-amber-800">
          {renderInlineMarkdown(exercise.hint)}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          {tokens.map((token, index) => {
            const isSelected = selectedSet.has(index);
            const showCorrect = submitted && incorrectSet.has(index);
            const showWrong = submitted && isSelected && !incorrectSet.has(index);

            const classes = [
              "rounded-xl border px-3 py-2 text-sm font-medium transition cursor-pointer",
              showCorrect
                ? "border-[#80ac5f] bg-[#80ac5f]/10 text-slate-800"
                : showWrong
                ? "border-red-400 bg-red-50 text-red-700"
                : isSelected
                ? "border-2 border-[#475dd7] bg-[#475dd7]/5"
                : "border border-slate-200 bg-white hover:bg-slate-50",
            ].join(" ");

            return (
              <button
                key={`token-${index}`}
                type="button"
                onClick={() => setSelected(index)}
                className={classes}
                disabled={submitted}
              >
                {renderInlineMarkdown(token)}
              </button>
            );
          })}
        </div>

        {submitted && exercise?.correction_sentence ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-2">
            <div className="flex items-start gap-2">
              <span aria-hidden="true">❌</span>
              <p>
                {tokens.map((token, index) => {
                  const isIncorrect = incorrectSet.has(index);
                  return (
                    <span
                      key={`incorrect-${index}`}
                      className={isIncorrect ? "text-red-600 line-through" : "text-slate-700"}
                    >
                      {renderInlineMarkdown(token)}
                      {index < tokens.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span aria-hidden="true">✅</span>
              <p>{renderInlineMarkdown(exercise.correction_sentence)}</p>
            </div>
          </div>
        ) : null}

        {submitted && selected.length > 0
          ? selected
              .map((idx) => tokenFeedback[idx])
              .filter((value) => value && value.trim().length > 0)
              .map((value, idx) => (
                <p key={`token-feedback-${idx}`} className="text-sm text-slate-500">
                  {renderInlineMarkdown(value)}
                </p>
              ))
          : null}
      </div>

      {!submitted ? (
        <button
          className="px-4 py-2 rounded-xl bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          disabled={!selected || selected.length === 0}
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
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span
                className={[
                  "text-base sm:text-lg font-semibold",
                  isCorrect ? "text-[#2f5d22]" : "text-red-700",
                ].join(" ")}
              >
                {renderInlineMarkdown(feedback)}
              </span>
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
              <img src={nextIcon} alt="" aria-hidden="true" className="h-10 w-10" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
