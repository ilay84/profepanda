import { useEffect, useMemo, useRef, useState } from "react";

import nextIcon from "../../assets/icons/lessons/next.svg";
import speedIcon from "../../assets/icons/lessons/speed.svg";
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


export default function DictationSelect({
  exercise,
  onAnswer,
  showHint,
  attempt,
  setAttempt,
}) {
  const [localSelected, setLocalSelected] = useState(null);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const audioRef = useRef(null);

  const selected = attempt ? attempt.selected : localSelected;
  const submitted = attempt ? attempt.submitted : localSubmitted;

  const options = useMemo(() => {
    const list = Array.isArray(exercise?.options) ? [...exercise.options] : [];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [exercise?.id, exercise?.options]);
  const optionFeedback = exercise?.option_feedback ?? [];
  const optionFeedbackMap = useMemo(() => {
    const map = {};
    (exercise?.options || []).forEach((opt, i) => {
      map[opt] = optionFeedback[i] || "";
    });
    return map;
  }, [exercise?.options, optionFeedback]);

  const correctAnswer = (exercise?.correct_answer ?? "").trim();
  const selectedText = selected == null ? "" : options[selected] ?? "";
  const isCorrect = selectedText === correctAnswer;

  const setSelected = (index) => {
    if (submitted) return;
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), selected: index }));
    } else {
      setLocalSelected(index);
    }
  };

  const clampRate = (value) => Math.min(1.5, Math.max(0.5, value));
  const formattedRate = `x${playbackRate.toFixed(2)}`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleCheck = () => {
    if (selected == null) return;
    if (setAttempt) {
      setAttempt((prev) => ({ ...(prev ?? {}), submitted: true }));
    } else {
      setLocalSubmitted(true);
    }
    if (isCorrect) {
      const audioUrl = exercise?.post_correct_audio_url;
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
      <div className="text-left">
        <h2 className="text-2xl md:text-3xl font-normal text-slate-800 mb-2">
          {renderInlineMarkdown(exercise?.question || "Dictation (Select)")}
        </h2>
        <p className="text-slate-500">Listen and click the word you hear</p>
      </div>
      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint && (
        <div className="border rounded-xl p-3 bg-amber-50 text-amber-800">
          {renderInlineMarkdown(exercise.hint)}
        </div>
      )}

      {exercise?.audio_url ? (
        <audio
          ref={audioRef}
          src={exercise.audio_url}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      ) : null}

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={toggleAudio}
          className={
            "rounded-full w-14 h-14 p-0 transition-all border cursor-pointer hover:shadow-sm disabled:cursor-default " +
            (isPlaying
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")
          }
          title="Play audio"
          disabled={!exercise?.audio_url}
        >
          <img
            src="/static/assets/icons/play.svg"
            alt=""
            className="h-8 w-8 mx-auto"
            aria-hidden="true"
          />
        </button>

        {exercise?.audio_url ? (
          <>
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <img src={speedIcon} alt="" className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-600">{formattedRate}</span>
              <button
                type="button"
                onClick={() => setPlaybackRate((prev) => clampRate(prev - 0.05))}
                disabled={playbackRate <= 0.5}
                className="h-6 w-6 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
                title="Slower"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setPlaybackRate((prev) => clampRate(prev + 0.05))}
                disabled={playbackRate >= 1.5}
                className="h-6 w-6 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
                title="Faster"
              >
                +
              </button>
            </div>

            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setSpeedOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm cursor-pointer"
                title="Playback speed"
              >
                <img src={speedIcon} alt="" className="h-4 w-4" aria-hidden="true" />
                <span>{formattedRate}</span>
              </button>
              {speedOpen ? (
                <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(clampRate(Number(e.target.value)))}
                    className="cursor-pointer"
                    style={{ writingMode: "vertical-lr", direction: "rtl", height: "120px" }}
                    aria-label="Playback speed"
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selected === index;
          const showCorrect = submitted && option === correctAnswer;
          const showWrong = submitted && isSelected && !isCorrect;

          const classes = [
            "w-full text-left rounded-xl p-3 border transition font-medium",
            showCorrect
              ? "border-[#80ac5f] bg-[#80ac5f]/10 text-slate-800"
              : showWrong
              ? "border-red-400 bg-red-50 text-red-700"
              : isSelected
              ? "border-2 border-[#475dd7] bg-[#475dd7]/5"
              : "border border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ");

          const showFeedback = submitted && selected === index && optionFeedbackMap[option];

          return (
            <button
              key={`${option}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              className={[classes, "cursor-pointer disabled:cursor-default"].join(" ")}
              disabled={submitted}
            >
              <div>
                <div>{option}</div>
                {showFeedback ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {renderInlineMarkdown(optionFeedbackMap[option])}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          className="px-4 py-2 rounded-xl bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          disabled={selected == null}
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
              <span
                className={[
                  "text-base sm:text-lg font-semibold",
                  isCorrect ? "text-[#2f5d22]" : "text-red-700",
                ].join(" ")}
              >
                {isCorrect ? "Correct." : `Incorrect. Expected: ${correctAnswer}`}
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
