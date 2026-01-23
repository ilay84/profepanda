import { useEffect, useMemo, useState } from "react";

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


function normalizeMorpheme(item) {
  if (typeof item === "string") {
    return { text: item, type: "root", label: "" };
  }
  return {
    text: item?.text || "",
    type: item?.type || "root",
    label: item?.label || "",
  };
}

function displayMorpheme(text, showHyphenation) {
  if (showHyphenation) return text;
  return text.replace(/^-+|-+$/g, "");
}

const typeTextClasses = {
  prefix: "text-[#475dd7] font-semibold",
  root: "text-slate-900 font-semibold",
  suffix: "text-[#475dd7] font-semibold",
  other: "text-slate-700",
};

function morphemeLabel(item) {
  if (item?.label) return item.label;
  if (!item?.type) return "";
  return item.type.replace(/_/g, " ");
}

export default function MorphologyBuilder({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const [localSelected, setLocalSelected] = useState([]);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [localIsCorrect, setLocalIsCorrect] = useState(false);
  const [localPoolOrder, setLocalPoolOrder] = useState([]);
  const [audioLocked, setAudioLocked] = useState(false);

  const selected = attempt?.selected ?? localSelected;
  const submitted = attempt?.submitted ?? localSubmitted;
  const isCorrect = attempt?.isCorrect ?? localIsCorrect;
  const poolOrder = attempt?.poolOrder ?? localPoolOrder;

  const showHyphenation = exercise?.show_hyphenation !== false;

  const basePool = useMemo(() => {
    const raw = Array.isArray(exercise?.morpheme_pool) ? exercise.morpheme_pool : [];
    return raw.map(normalizeMorpheme).filter((item) => item.text.trim());
  }, [exercise?.morpheme_pool]);

  useEffect(() => {
    if (!basePool.length) return;
    if (poolOrder.length === basePool.length) return;
    const ordered =
      exercise?.shuffle_pool === false ? basePool : [...basePool].sort(() => Math.random() - 0.5);
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), poolOrder: ordered }));
    } else {
      setLocalPoolOrder(ordered);
    }
  }, [basePool, poolOrder.length, exercise?.shuffle_pool, setAttempt]);

  const pool = poolOrder.length === basePool.length ? poolOrder : basePool;

  const correctSequence = useMemo(() => {
    if (!Array.isArray(exercise?.correct_sequence)) return [];
    return exercise.correct_sequence.map((value) => String(value ?? "").trim());
  }, [exercise?.correct_sequence]);

  const usedIndices = useMemo(
    () => new Set(selected.map((item) => item.index)),
    [selected]
  );

  const handleSelect = (item, index) => {
    if (submitted) return;
    if (usedIndices.has(index)) return;
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), selected: [...(prev?.selected ?? []), { ...item, index }] }));
    } else {
      setLocalSelected((prev) => [...prev, { ...item, index }]);
    }
  };

  const handleRemove = (position) => {
    if (submitted) return;
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), selected: (prev?.selected ?? []).slice(0, position) }));
    } else {
      setLocalSelected((prev) => prev.slice(0, position));
    }
  };

  const handleReset = () => {
    if (submitted) return;
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), selected: [] }));
    } else {
      setLocalSelected([]);
    }
  };

  const handleCheck = () => {
    const userSequence = selected.map((item) => String(item.text || "").trim());
    const correct =
      userSequence.length === correctSequence.length &&
      userSequence.every((value, idx) => value === correctSequence[idx]);
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), submitted: true, isCorrect: correct }));
    } else {
      setLocalIsCorrect(correct);
      setLocalSubmitted(true);
    }
    if (correct) {
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

  const feedbackText = isCorrect
    ? exercise?.correct_feedback || ""
    : exercise?.incorrect_feedback || "";

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h2 className="text-2xl md:text-3xl font-normal text-slate-800 mb-2">
          {renderInlineMarkdown(exercise.question || "Build the word")}
        </h2>
        <p className="text-slate-500">Tap morphemes to build the word in order</p>
      </div>

      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="h-5 w-5 rounded-full bg-amber-200 mt-0.5" />
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        </div>
      ) : null}

      <div className="bg-slate-50 rounded-2xl p-4 min-h-[96px] border-2 border-dashed border-slate-200">
        <div className="flex flex-wrap gap-2 items-center">
          {(() => {
            const groups = [];
            let current = [];
            let startIndex = 0;
            selected.forEach((item, index) => {
              const isDocked = ["prefix", "root", "suffix"].includes(item.type);
              if (!isDocked) {
                if (current.length) {
                  groups.push({ startIndex, items: current });
                  current = [];
                }
                groups.push({ startIndex: index, items: [item] });
                return;
              }
              if (!current.length) {
                startIndex = index;
              }
              current.push(item);
            });
            if (current.length) {
              groups.push({ startIndex, items: current });
            }

            return groups.map((group, groupIndex) => {
              const lastIndex = group.startIndex + group.items.length - 1;
              const lastItem = group.items[group.items.length - 1];
              const showConnector =
                (lastItem.type === "prefix" || lastItem.type === "root") &&
                lastIndex === selected.length - 1;
              const isDockedGroup = group.items.every((item) =>
                ["prefix", "root", "suffix"].includes(item.type)
              );
              return (
                <button
                  key={`group-${groupIndex}-${group.startIndex}`}
                  type="button"
                  onClick={() => handleRemove(lastIndex)}
                  disabled={submitted}
                  className={[
                    "relative px-4 py-2 text-base transition-all duration-200 ease-out cursor-pointer disabled:cursor-default border",
                    "bg-white text-slate-800 border-slate-200 hover:border-slate-300",
                    isDockedGroup ? "rounded-lg" : "rounded-xl",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {group.items.map((item, itemIndex) => {
                    const isRoot = item.type === "root";
                    const isPrefix = item.type === "prefix";
                    const isSuffix = item.type === "suffix";
                    const textClass = isRoot
                      ? "font-semibold text-slate-900"
                      : isPrefix || isSuffix
                      ? "font-semibold text-[#475dd7] underline underline-offset-2"
                      : "text-slate-700";
                    return (
                      <span key={`${item.text}-${itemIndex}`} className={textClass}>
                        {renderInlineMarkdown(
                          displayMorpheme(item.text, showHyphenation)
                        )}
                      </span>
                    );
                  })}
                  {showConnector ? (
                    <span className="pointer-events-none absolute -right-8 top-1/2 flex h-2 w-8 -translate-y-1/2 items-center">
                      <span className="h-0.5 w-full border-t-2 border-dashed border-[#475dd7]/60" />
                      <span className="absolute right-0 h-0 w-0 border-y-4 border-l-6 border-y-transparent border-l-[#475dd7]/60" />
                    </span>
                  ) : null}
                </button>
              );
            });
          })()}

          {!submitted && selected.length === 0 && (
            <span className="text-slate-400 text-sm">
              Tap morphemes below to build the word...
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {pool.map((item, index) => {
          const used = usedIndices.has(index);
          const textClass = typeTextClasses[item.type] || typeTextClasses.other;
          return (
            <div key={`${item.text}-${index}`} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleSelect(item, index)}
                disabled={submitted || used}
                className={[
                  "px-4 py-2 rounded-xl text-base transition-all duration-200 cursor-pointer disabled:cursor-default",
                  "border-2 shadow-sm",
                  !used && !submitted &&
                    "bg-white border-slate-200 hover:border-[#475dd7] hover:bg-indigo-50",
                  used && "opacity-40 border-slate-200 bg-slate-100",
                  submitted && "opacity-50 cursor-default",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={textClass}>
                  {renderInlineMarkdown(displayMorpheme(item.text, showHyphenation))}
                </span>
              </button>
              <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                {morphemeLabel(item)}
              </span>
            </div>
          );
        })}
      </div>

      {!submitted && selected.length > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-500 text-sm hover:text-slate-700 cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {submitted && (
        <div className="flex items-start gap-3">
          <PandaSprite variant={isCorrect ? "correct" : "incorrect"} />
          <div
            className={[
              "rounded-xl p-4 border flex-1",
              isCorrect
                ? "bg-[#80ac5f]/10 border-[#80ac5f]/30"
                : "bg-red-50 border-red-200",
            ].join(" ")}
          >
            {isCorrect ? (
              <span className="font-medium text-[#2f5d22]">Perfect!</span>
            ) : (
              <div className="space-y-2">
                <span className="font-medium text-red-700">Not quite right</span>
                {correctSequence.length > 0 ? (
                  <p className="text-red-600 text-sm">
                    Correct build:{" "}
                    <strong>
                      {correctSequence.map((item) => displayMorpheme(item, showHyphenation)).join(" ")}
                    </strong>
                  </p>
                ) : null}
              </div>
            )}
            {feedbackText ? (
              <p className="mt-2 text-sm text-slate-600">
                {renderInlineMarkdown(feedbackText)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4">
        {!submitted ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={selected.length === 0}
            className="rounded-xl px-8 py-2 bg-[#475dd7] text-white hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          >
            Check Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            className={[
              "rounded-xl px-8 py-2 text-white",
              isCorrect
                ? "bg-[#80ac5f] hover:bg-[#6d9951]"
                : "bg-[#475dd7] hover:bg-[#3f53c4]",
              audioLocked ? "opacity-60 cursor-default" : "cursor-pointer",
            ].join(" ")}
            disabled={audioLocked}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
