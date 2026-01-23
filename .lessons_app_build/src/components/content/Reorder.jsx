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


function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function Reorder({ exercise, onAnswer, showHint }) {
  const items = useMemo(() => {
    const raw = Array.isArray(exercise?.items) ? exercise.items : [];
    return raw.filter((item) => String(item || "").trim().length > 0);
  }, [exercise?.items]);

  const [pool, setPool] = useState([]);
  const [slots, setSlots] = useState(() => Array(items.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);

  useEffect(() => {
    const shuffled = shuffle(
      items.map((text, index) => ({
        id: index,
        text,
      }))
    );
    setPool(shuffled);
    setSlots(Array(items.length).fill(null));
  }, [items]);

  const handleDragStart = (item, source, index) => (event) => {
    if (submitted) return;
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ id: item.id, source, index })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropSlot = (slotIndex) => (event) => {
    event.preventDefault();
    if (submitted) return;
    const payload = event.dataTransfer.getData("text/plain");
    if (!payload) return;
    const data = JSON.parse(payload);

    setPool((prevPool) => {
      let nextPool = [...prevPool];
      let incoming = null;

      if (data.source === "pool") {
        const poolIndex = nextPool.findIndex((item) => item.id === data.id);
        if (poolIndex === -1) return prevPool;
        incoming = nextPool[poolIndex];
        nextPool.splice(poolIndex, 1);
      }

      setSlots((prevSlots) => {
        const nextSlots = [...prevSlots];
        if (data.source === "slot") {
          incoming = prevSlots[data.index];
          nextSlots[data.index] = null;
        }

        if (!incoming) return prevSlots;

        const existing = nextSlots[slotIndex];
        nextSlots[slotIndex] = incoming;
        if (existing) {
          nextPool.push(existing);
        }
        return nextSlots;
      });

      return nextPool;
    });
  };

  const handleDropPool = (event) => {
    event.preventDefault();
    if (submitted) return;
    const payload = event.dataTransfer.getData("text/plain");
    if (!payload) return;
    const data = JSON.parse(payload);
    if (data.source !== "slot") return;

    setSlots((prevSlots) => {
      const nextSlots = [...prevSlots];
      const removed = nextSlots[data.index];
      if (!removed) return prevSlots;
      nextSlots[data.index] = null;
      setPool((prevPool) => [...prevPool, removed]);
      return nextSlots;
    });
  };

  const handleReset = () => {
    if (submitted) return;
    const shuffled = shuffle(
      items.map((text, index) => ({
        id: index,
        text,
      }))
    );
    setPool(shuffled);
    setSlots(Array(items.length).fill(null));
  };

  const handleCheck = () => {
    if (slots.some((slot) => !slot)) return;
    const currentIds = slots.map((slot) => slot.id);
    const correctIds = items.map((_, index) => index);
    const correct = JSON.stringify(currentIds) === JSON.stringify(correctIds);
    setIsCorrect(correct);
    setSubmitted(true);
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
          {renderInlineMarkdown(exercise.question || "Reorder the steps")}
        </h2>
        <p className="text-slate-500">
          Drag items from the list into the numbered slots
        </p>
      </div>

      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="h-5 w-5 rounded-full bg-amber-200 mt-0.5" />
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div
            key={`slot-${index}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropSlot(index)}
            className={[
              "flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 shadow-sm",
              submitted ? "opacity-90" : "hover:shadow-md",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-sm font-semibold">
              {index + 1}
            </div>
            {slot ? (
              <div
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-grab"
                draggable={!submitted}
                onDragStart={handleDragStart(slot, "slot", index)}
              >
                {renderInlineMarkdown(slot.text)}
              </div>
            ) : (
              <div className="flex-1 text-sm text-slate-400">
                Drop here
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropPool}
      >
        <p className="text-xs text-slate-500 mb-3">
          Drag from the list into the slots above.
        </p>
        <div className="flex flex-wrap gap-2">
          {pool.map((item, index) => (
            <button
              key={`pool-${item.id}-${index}`}
              type="button"
              draggable={!submitted}
              onDragStart={handleDragStart(item, "pool", index)}
              className={[
                "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm",
                submitted ? "cursor-default opacity-60" : "cursor-grab hover:shadow-md",
              ].join(" ")}
            >
              {renderInlineMarkdown(item.text)}
            </button>
          ))}
          {pool.length === 0 ? (
            <span className="text-sm text-slate-400">Pool is empty.</span>
          ) : null}
        </div>
      </div>

      {!submitted ? (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-500 text-sm hover:text-slate-700 cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={slots.some((slot) => !slot)}
            className="rounded-xl px-8 py-2 bg-[#475dd7] text-white hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          >
            Check Answer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
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
                <span className="font-medium text-red-700">Not quite right</span>
              )}
              {feedbackText ? (
                <p className="mt-2 text-sm text-slate-600">
                  {renderInlineMarkdown(feedbackText)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-center">
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
          </div>
        </div>
      )}
    </div>
  );
}
