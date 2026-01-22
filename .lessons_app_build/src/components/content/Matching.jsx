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


export default function Matching({ exercise, onAnswer, showHint, attempt, setAttempt }) {
  const pairs = exercise?.matching_pairs ?? [];

  const rightShuffled = useMemo(() => {
    return [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5);
  }, [pairs]);

  const leftToRight = useMemo(() => {
    const map = {};
    for (const p of pairs) map[p.left] = p.right;
    return map;
  }, [pairs]);

  const leftIndex = useMemo(() => {
    const map = {};
    pairs.forEach((p, i) => {
      map[p.left] = i;
    });
    return map;
  }, [pairs]);

  const [localSelectedLeft, setLocalSelectedLeft] = useState(null);
  const [localMatches, setLocalMatches] = useState({});
  const [localRightOrder, setLocalRightOrder] = useState(rightShuffled);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);

  const [wrongPulseRight, setWrongPulseRight] = useState(null);

  const selectedLeft = attempt ? attempt.selectedLeft ?? null : localSelectedLeft;
  const matches = attempt ? attempt.matches ?? {} : localMatches;
  const rightOrder = attempt?.rightOrder ?? localRightOrder;
  const completed = attempt ? attempt.completed : localCompleted;

  const handleLeft = (left) => {
    if (matches[left]) return;
    if (setAttempt) {
      setAttempt((prev) => ({
        ...(prev ?? {}),
        selectedLeft: left,
        matches,
        rightOrder,
      }));
    } else {
      setLocalSelectedLeft(left);
    }
  };

  const handleRightClick = (right) => {
    if (!selectedLeft) return;

    const expected = leftToRight[selectedLeft];
    const correct = expected === right;

    if (!correct) {
      playIncorrectSound();
      setWrongPulseRight(right);
      if (setAttempt) {
        setAttempt((prev) => ({
          ...(prev ?? {}),
          selectedLeft: null,
          matches,
          rightOrder,
        }));
      } else {
        setLocalSelectedLeft(null);
      }
      window.setTimeout(() => setWrongPulseRight(null), 250);
      return;
    }

    const matchedPair = pairs.find(
      (pair) => pair.left === selectedLeft && pair.right === right
    );
    const audioUrl = matchedPair?.audio_url;
    if (audioUrl) {
      setAudioLocked(true);
    }
    playCorrectSoundThen(audioUrl).finally(() => {
      if (audioUrl) {
        setAudioLocked(false);
      }
    });

    const nextMatches = { ...matches, [selectedLeft]: right };

    const targetRow = leftIndex[selectedLeft];
    const nextRightOrder = (() => {
      const next = [...rightOrder];
      const fromIndex = next.findIndex((r) => r === right);
      if (fromIndex === -1 || targetRow == null) return next;

      const tmp = next[targetRow];
      next[targetRow] = next[fromIndex];
      next[fromIndex] = tmp;

      return next;
    })();

    const isNowCompleted = Object.keys(nextMatches).length === pairs.length;

    if (setAttempt) {
      setAttempt((prev) => ({
        ...(prev ?? {}),
        selectedLeft: null,
        matches: nextMatches,
        rightOrder: nextRightOrder,
        completed: isNowCompleted ? true : prev?.completed ?? false,
        submitted: isNowCompleted ? true : prev?.submitted ?? false,
      }));
    } else {
      setLocalMatches(nextMatches);
      setLocalRightOrder(nextRightOrder);
      setLocalSelectedLeft(null);
      if (isNowCompleted) {
        setLocalCompleted(true);
      }
    }
  };

  return (
    <div className="space-y-4">
      {exercise?.question ? (
        <h2 className="text-xl font-normal text-slate-800">
          {renderInlineMarkdown(exercise.question)}
        </h2>
      ) : null}
      <PromptImage src={exercise?.prompt_image_url} />
      <p className="text-sm text-slate-500">Match the pairs</p>

      {showHint && exercise?.hint && (
        <div className="border rounded-xl p-3 bg-amber-50 text-amber-800">
          {renderInlineMarkdown(exercise.hint)}
        </div>
      )}

      <div className="grid gap-2">
        {pairs.map((p, i) => {
          const left = p.left;
          const right = rightOrder[i];

          const isMatched = !!matches[left];
          const isSelected = selectedLeft === left;
          const isWrongPulse = wrongPulseRight === right;

          const leftClasses = [
            "w-full text-left rounded-xl p-3 border transition font-medium cursor-pointer disabled:cursor-default",
            isMatched
              ? "border-[#80ac5f] bg-[#80ac5f]/10 text-slate-800 opacity-80"
              : isSelected
              ? "border-2 border-[#475dd7] bg-[#475dd7]/5"
              : "border border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ");

          const rightClasses = [
            "w-full text-left rounded-xl p-3 border transition font-medium cursor-pointer disabled:cursor-default",
            isMatched
              ? "border-[#80ac5f] bg-[#80ac5f]/10 text-slate-800 opacity-80"
              : isWrongPulse
              ? "border-red-400 bg-red-50"
              : "border border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ");

          const connectorClasses = [
            "h-0.5 w-10 sm:w-14 rounded-full transition",
            isMatched
              ? "bg-[#80ac5f]"
              : isSelected
              ? "bg-[#475dd7]"
              : "bg-slate-200",
          ].join(" ");

          return (
            <div key={left} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <button
                type="button"
                onClick={() => handleLeft(left)}
                className={leftClasses}
                disabled={isMatched}
                aria-pressed={isSelected}
              >
                {left}
              </button>

              <div className="flex items-center justify-center">
                <div className={connectorClasses} aria-hidden="true" />
              </div>

              <button
                type="button"
                onClick={() => handleRightClick(right)}
                className={rightClasses}
                disabled={isMatched}
              >
                {right}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-sm text-slate-500 text-center">
        {Object.keys(matches).length} of {pairs.length} matched
      </div>

      {completed && (
        <div className="flex items-start gap-3">
          <PandaSprite variant="correct" />
          <div
            className={[
              "flex items-center justify-between gap-3 rounded-2xl border p-4 flex-1",
              "border-[#80ac5f]/30 bg-[#80ac5f]/10",
            ].join(" ")}
          >
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="text-base sm:text-lg font-semibold text-[#2f5d22]">
                Correct.
              </span>
            </div>

            <button
              type="button"
              title="Continue"
              aria-label="Continue"
              onClick={() => onAnswer(true)}
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
