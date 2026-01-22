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


export default function PictureSelectAll({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const [localSelected, setLocalSelected] = useState([]);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);

  const selected = attempt ? attempt.selected ?? [] : localSelected;
  const submitted = attempt ? attempt.submitted : localSubmitted;

  const options = useMemo(() => {
    return Array.isArray(exercise?.picture_options)
      ? exercise.picture_options
      : [];
  }, [exercise?.picture_options]);

  const optionFeedback = exercise?.option_feedback ?? [];
  const correctIndices = useMemo(() => {
    if (Array.isArray(exercise?.correct_indices) && exercise.correct_indices.length > 0) {
      return exercise.correct_indices
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0);
    }
    if (typeof exercise?.correct_index === "number") {
      return [exercise.correct_index];
    }
    return [];
  }, [exercise?.correct_indices, exercise?.correct_index]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const correctSet = useMemo(() => new Set(correctIndices), [correctIndices]);

  const isCorrect = useMemo(() => {
    if (correctSet.size === 0) return false;
    if (selectedSet.size !== correctSet.size) return false;
    for (const value of correctSet) {
      if (!selectedSet.has(value)) return false;
    }
    return true;
  }, [selectedSet, correctSet]);

  const feedback = useMemo(() => {
    if (!submitted) return "";
    return isCorrect ? "Correct." : "Incorrect.";
  }, [submitted, isCorrect]);

  const toggleSelected = (index) => {
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
    if (!selected.length) return;
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option, index) => {
          const isSelected = selectedSet.has(index);
          const isCorrectOption = correctSet.has(index);
          const showCorrect = submitted && isCorrectOption;
          const showWrong = submitted && isSelected && !isCorrectOption;

          const classes = [
            "group rounded-2xl border p-3 transition cursor-pointer text-left",
            showCorrect
              ? "border-[#80ac5f] bg-[#80ac5f]/10"
              : showWrong
              ? "border-red-400 bg-red-50"
              : isSelected
              ? "border-2 border-[#475dd7] bg-[#475dd7]/5"
              : "border border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ");

          const feedbackText =
            submitted && isSelected ? optionFeedback[index] || "" : "";

          return (
            <button
              key={`picture-multi-option-${index}`}
              type="button"
              onClick={() => toggleSelected(index)}
              className={classes}
              disabled={submitted}
            >
              <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 h-40 sm:h-44">
                {option?.image_url ? (
                  <img
                    src={option.image_url}
                    alt={option?.label || `Option ${index + 1}`}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No image</span>
                )}
              </div>
              {option?.label ? (
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {renderInlineMarkdown(option.label)}
                </div>
              ) : null}
              {feedbackText ? (
                <p className="mt-2 text-xs text-slate-500">
                  {renderInlineMarkdown(feedbackText)}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          className="px-4 py-2 rounded-xl bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          disabled={selected.length === 0}
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
