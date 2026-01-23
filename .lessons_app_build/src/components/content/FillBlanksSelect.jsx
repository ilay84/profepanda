import { useEffect, useMemo, useState } from "react";

import nextIcon from "../../assets/icons/lessons/next.svg";
import { playCorrectSoundThen, playIncorrectSound } from "../../utils/sound.js";
import PandaSprite from "./PandaSprite.jsx";
import PromptImage from "./PromptImage.jsx";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
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


export default function FillBlanksSelect({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const [localFilledBlanks, setLocalFilledBlanks] = useState({});
  const [localActiveBlankIndex, setLocalActiveBlankIndex] = useState(0);
  const [localUsedPills, setLocalUsedPills] = useState([]);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [localIsCorrect, setLocalIsCorrect] = useState(false);
  const [localPillOrder, setLocalPillOrder] = useState([]);
  const [audioLocked, setAudioLocked] = useState(false);

  const filledBlanks = attempt?.filledBlanks ?? localFilledBlanks;
  const activeBlankIndex = attempt?.activeBlankIndex ?? localActiveBlankIndex;
  const usedPills = attempt?.usedPills ?? localUsedPills;
  const usedPillsSet = useMemo(() => new Set(usedPills), [usedPills]);
  const submitted = attempt?.submitted ?? localSubmitted;
  const isCorrect = attempt?.isCorrect ?? localIsCorrect;

  const answers = exercise?.fill_blanks_answers || [];
  const decoys = exercise?.fill_blanks_decoys || [];
  const answerFeedback = exercise?.fill_blanks_feedback || [];
  const decoyFeedback = exercise?.fill_blanks_decoy_feedback || [];
  const sentence = exercise?.fill_blanks_sentence || "";

  const basePills = useMemo(() => [...answers, ...decoys], [answers, decoys]);
  const pillOrder = attempt?.pillOrder ?? localPillOrder;

  useEffect(() => {
    if (!basePills.length) return;
    if (pillOrder.length === basePills.length) return;
    const shuffled = [...basePills].sort(() => Math.random() - 0.5);
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), pillOrder: shuffled }));
    } else {
      setLocalPillOrder(shuffled);
    }
  }, [basePills, pillOrder.length, setAttempt]);

  const allPills = pillOrder.length === basePills.length ? pillOrder : basePills;

  const sentenceParts = useMemo(() => {
    const parts = [];
    let lastIndex = 0;
    const regex = /\{(\d+)\}/g;
    let match;

    while ((match = regex.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: sentence.slice(lastIndex, match.index) });
      }
      parts.push({ type: "blank", index: Number(match[1]) - 1 });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < sentence.length) {
      parts.push({ type: "text", content: sentence.slice(lastIndex) });
    }

    return parts;
  }, [sentence]);

  const totalBlanks = answers.length;
  const filledCount = Object.keys(filledBlanks).length;

  const handlePillClick = (pill, pillIndex) => {
    if (submitted || usedPillsSet.has(pillIndex)) return;

    const nextFilled = {
      ...filledBlanks,
      [activeBlankIndex]: { pill, pillIndex },
    };
    const nextUsed = new Set(usedPillsSet);
    nextUsed.add(pillIndex);

    let nextActive = activeBlankIndex;
    for (let i = 0; i < totalBlanks; i += 1) {
      const nextIndex = (activeBlankIndex + 1 + i) % totalBlanks;
      if (!nextFilled[nextIndex] && nextIndex !== activeBlankIndex) {
        nextActive = nextIndex;
        break;
      }
    }

    if (setAttempt) {
      setAttempt((prev) => ({
        ...(prev ?? {}),
        filledBlanks: nextFilled,
        usedPills: [...nextUsed],
        activeBlankIndex: nextActive,
      }));
    } else {
      setLocalFilledBlanks(nextFilled);
      setLocalUsedPills([...nextUsed]);
      setLocalActiveBlankIndex(nextActive);
    }
  };

  const handleBlankClick = (blankIndex) => {
    if (submitted) return;

    let nextFilled = filledBlanks;
    let nextUsed = usedPillsSet;

    if (filledBlanks[blankIndex]) {
      const { pillIndex } = filledBlanks[blankIndex];
      nextUsed = new Set(usedPillsSet);
      nextUsed.delete(pillIndex);
      nextFilled = { ...filledBlanks };
      delete nextFilled[blankIndex];
    }

    if (setAttempt) {
      setAttempt((prev) => ({
        ...(prev ?? {}),
        filledBlanks: nextFilled,
        usedPills: [...nextUsed],
        activeBlankIndex: blankIndex,
      }));
    } else {
      setLocalFilledBlanks(nextFilled);
      setLocalUsedPills([...nextUsed]);
      setLocalActiveBlankIndex(blankIndex);
    }
  };

  const handleCheck = () => {
    let allCorrect = true;
    for (let i = 0; i < totalBlanks; i += 1) {
      if (!filledBlanks[i] || filledBlanks[i].pill !== answers[i]) {
        allCorrect = false;
        break;
      }
    }
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), submitted: true, isCorrect: allCorrect }));
    } else {
      setLocalIsCorrect(allCorrect);
      setLocalSubmitted(true);
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
    onAnswer(isCorrect);
  };

  const feedbackItems = useMemo(() => {
    if (!submitted) return [];
    const items = [];
    Object.keys(filledBlanks)
      .map((key) => Number(key))
      .sort((a, b) => a - b)
      .forEach((blankIndex) => {
        const entry = filledBlanks[blankIndex];
        const pill = entry?.pill ?? "";
        if (!pill) return;
        const answerIndex = answers.indexOf(pill);
        const decoyIndex = decoys.indexOf(pill);
        let feedback = "";
        if (answerIndex >= 0) {
          feedback = answerFeedback[answerIndex] || "";
        } else if (decoyIndex >= 0) {
          feedback = decoyFeedback[decoyIndex] || "";
        }
        if (feedback.trim().length === 0) return;
        items.push({ blankIndex, feedback });
      });
    return items;
  }, [submitted, filledBlanks, answers, decoys, answerFeedback, decoyFeedback]);

  return (
    <div className="space-y-6">
      {exercise?.question ? (
        <div className="text-left">
          <h2 className="text-xl md:text-2xl font-normal text-slate-800 mb-2">
            {renderInlineMarkdown(exercise.question)}
          </h2>
        </div>
      ) : null}
      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5">?</span>
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-xl leading-relaxed flex flex-wrap items-center gap-1">
          {sentenceParts.map((part, idx) => {
            if (part.type === "text") {
              return (
                <span key={idx} className="text-slate-800">
                  {renderInlineMarkdown(part.content)}
                </span>
              );
            }

            const blankIndex = part.index;
            const filled = filledBlanks[blankIndex];
            const isActive = activeBlankIndex === blankIndex && !submitted;
            const isCorrectBlank =
              submitted && filled && filled.pill === answers[blankIndex];
            const isWrongBlank =
              submitted && filled && filled.pill !== answers[blankIndex];

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleBlankClick(blankIndex)}
                disabled={submitted}
                className={cn(
                  "inline-flex items-center justify-center min-w-[80px] px-3 py-1 rounded-lg border-2 border-dashed transition-all cursor-pointer disabled:cursor-default",
                  !filled && !isActive && "border-slate-300 bg-slate-50 text-slate-400",
                  !filled && isActive && "border-[#475dd7] bg-[#475dd7]/10 animate-pulse",
                  filled && !submitted && "border-[#475dd7] bg-[#475dd7] text-white border-solid",
                  isCorrectBlank && "border-[#80ac5f] bg-[#80ac5f] text-white border-solid",
                  isWrongBlank && "border-red-500 bg-red-500 text-white border-solid"
                )}
              >
                {filled ? (
                  <span className="font-medium">{filled.pill}</span>
                ) : (
                  <span className="text-sm">{blankIndex + 1}</span>
                )}
              </button>
            );
          })}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {allPills.map((pill, index) => {
          const isUsed = usedPillsSet.has(index);

          return (
            <button
              key={`${pill}-${index}`}
              type="button"
              onClick={() => handlePillClick(pill, index)}
              disabled={submitted || isUsed}
              className={cn(
                "px-4 py-2 rounded-xl text-base font-medium transition-all duration-200",
                "border-2 shadow-sm",
                !isUsed && !submitted && "bg-white border-slate-200 hover:border-[#475dd7] hover:bg-[#475dd7]/5 cursor-pointer",
                isUsed && "opacity-30 border-slate-200 bg-slate-100",
                submitted && "opacity-50 cursor-default"
              )}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {submitted ? (
        <div className="flex items-start gap-3">
          <PandaSprite variant={isCorrect ? "correct" : "incorrect"} />
          <div
            className={cn(
              "rounded-xl p-4 border flex-1",
              isCorrect
                ? "bg-[#80ac5f]/10 border-[#80ac5f]/30"
                : "bg-red-50 border-red-200"
            )}
          >
            {isCorrect ? (
              <span className="font-medium text-[#2f5d22]">Correct.</span>
            ) : (
              <div className="space-y-2">
                <span className="font-medium text-red-700">Not quite right</span>
                <p className="text-red-600 text-sm">
                  Correct answers: {answers.join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {submitted && feedbackItems.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Answer feedback</p>
          <div className="space-y-2">
            {feedbackItems.map((item) => (
              <div key={`blank-feedback-${item.blankIndex}`} className="text-sm text-slate-600">
                <span className="font-semibold text-slate-700">
                  Blank {item.blankIndex + 1}:
                </span>{" "}
                {renderInlineMarkdown(item.feedback)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-center pt-4">
        {!submitted ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={filledCount < totalBlanks}
            className="rounded-xl px-8 py-2.5 bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          >
            Check Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            className={cn(
              "inline-flex items-center rounded-xl px-8 py-2.5 text-white font-semibold shadow-sm transition cursor-pointer",
              isCorrect ? "bg-[#80ac5f] hover:bg-[#6f9951]" : "bg-[#475dd7] hover:bg-[#3f53c4]",
              audioLocked && "opacity-60 cursor-default"
            )}
            disabled={audioLocked}
          >
            Continue
            <img src={nextIcon} alt="" aria-hidden="true" className="ml-2 h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
