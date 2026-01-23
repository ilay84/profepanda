import { useMemo, useState } from "react";

import nextIcon from "../../assets/icons/lessons/next.svg";
import { playCorrectSoundThen, playIncorrectSound } from "../../utils/sound.js";
import PandaSprite from "./PandaSprite.jsx";
import PromptImage from "./PromptImage.jsx";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function shuffleList(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
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


export default function SelectAll({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const [localSelected, setLocalSelected] = useState([]);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [localIsCorrect, setLocalIsCorrect] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);
  const selected = attempt ? attempt.selected ?? [] : localSelected;
  const submitted = attempt ? attempt.submitted : localSubmitted;

  const options = useMemo(() => {
    const base = Array.isArray(exercise?.options) ? exercise.options : [];
    return shuffleList(base);
  }, [exercise?.id, exercise?.options]);
  const correctOptions = useMemo(
    () =>
      (Array.isArray(exercise?.correct_options)
        ? exercise.correct_options
        : []
      ).map((item) => String(item)),
    [exercise?.correct_options]
  );
  const isCorrect = useMemo(() => {
    if (!selected.length || !correctOptions.length) return false;
    const selectedSet = new Set(selected.map((value) => String(value).trim()));
    const correctSet = new Set(correctOptions.map((value) => String(value).trim()));
    return (
      selectedSet.size === correctSet.size &&
      [...correctSet].every((item) => selectedSet.has(item))
    );
  }, [selected, correctOptions]);
  const resolvedIsCorrect =
    typeof attempt?.isCorrect === "boolean" ? attempt.isCorrect : localIsCorrect || isCorrect;
  const optionFeedback = exercise?.option_feedback ?? [];
  const optionFeedbackMap = useMemo(() => {
    const map = {};
    (exercise?.options || []).forEach((opt, i) => {
      map[opt] = optionFeedback[i] || "";
    });
    return map;
  }, [exercise?.options, optionFeedback]);

  const toggleOption = (value) => {
    if (submitted) return;
    const update = (prevSelected) => {
      const current = Array.isArray(prevSelected) ? prevSelected : [];
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    };
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), selected: update(prev?.selected) }));
    } else {
      setLocalSelected((prev) => update(prev));
    }
  };

  const handleCheck = () => {
    const allCorrect = isCorrect;
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), submitted: true, isCorrect: allCorrect }));
    } else {
      setLocalSubmitted(true);
      setLocalIsCorrect(allCorrect);
    }
    if (allCorrect) {
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
    onAnswer(resolvedIsCorrect);
  };

  const correctList = correctOptions.join(", ");

  return (
    <div className="space-y-6">
      {exercise?.question ? (
        <div className="text-left">
          <div className="text-base md:text-lg font-normal text-slate-700 mb-2">
            {renderInlineMarkdown(exercise.question)}
          </div>
        </div>
      ) : null}
      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5">?</span>
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 min-h-[64px] flex flex-wrap gap-2">
          {selected.length === 0 ? (
            <span className="text-sm text-slate-400">
              Select all correct options below.
            </span>
          ) : (
            selected.map((value) => {
              const isCorrectChoice = correctOptions.includes(value);
              return (
                <button
                  key={`selected-${value}`}
                  type="button"
                  onClick={() => toggleOption(value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition border cursor-pointer",
                    submitted
                      ? isCorrectChoice
                        ? "bg-[#80ac5f] text-white border-[#80ac5f]"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-[#475dd7] text-white border-[#475dd7] hover:brightness-95 cursor-pointer"
                  )}
                >
                  {value}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {options.map((value, index) => {
            const isSelected = selected.includes(value);
            const feedback = optionFeedbackMap[value] || "";
            const showFeedback = submitted && isSelected && feedback;
            return (
              <button
                key={`option-${value}`}
                type="button"
                onClick={() => toggleOption(value)}
                disabled={submitted}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium border transition cursor-pointer disabled:cursor-default",
                  isSelected
                    ? "bg-[#475dd7] text-white border-[#475dd7]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#475dd7] hover:bg-[#475dd7]/5",
                  submitted && "opacity-60"
                )}
              >
                <div>
                  <div>{value}</div>
                  {showFeedback ? (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isSelected ? "text-white/90" : "text-slate-500"
                      )}
                    >
                      {renderInlineMarkdown(feedback)}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {submitted ? (
        <div className="flex items-start gap-3">
          <PandaSprite variant={resolvedIsCorrect ? "correct" : "incorrect"} />
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border p-4 flex-1",
              resolvedIsCorrect
                ? "border-[#80ac5f]/30 bg-[#80ac5f]/10"
                : "border-red-200 bg-red-50"
            )}
          >
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {resolvedIsCorrect ? (
                <span className="text-base sm:text-lg font-semibold text-[#2f5d22]">Correct.</span>
              ) : (
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-semibold text-red-700">
                    Not quite right
                  </span>
                  <p className="text-red-600 text-sm">Correct answers: {correctList}</p>
                </div>
              )}
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
      ) : null}

      <div className="flex justify-center pt-4">
        {!submitted ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={selected.length === 0}
            className="rounded-xl px-8 py-2.5 bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          >
            Check Answer
          </button>
        ) : null}
      </div>
    </div>
  );
}
