import { useEffect, useMemo, useRef, useState } from "react";

import speedIcon from "../../assets/icons/lessons/speed.svg";
import { playCorrectSoundThen, playIncorrectSound } from "../../utils/sound.js";
import PandaSprite from "./PandaSprite.jsx";
import PromptImage from "./PromptImage.jsx";

const LOWERCASE_CHARS = ["á", "é", "í", "ó", "ú", "ö", "ü", "ñ", "¿", "¡"];
const UPPERCASE_CHARS = ["Á", "É", "Í", "Ó", "Ú", "Ö", "Ü", "Ñ", "¿", "¡"];

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


function AccentButtons({ onInsert }) {
  const [uppercase, setUppercase] = useState(false);
  const chars = uppercase ? UPPERCASE_CHARS : LOWERCASE_CHARS;
  const toggleIcon = uppercase
    ? "/static/assets/icons/lowercase.svg"
    : "/static/assets/icons/uppercase.svg";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setUppercase((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition hover:bg-slate-100 cursor-pointer"
        title="Uppercase"
      >
        <img src={toggleIcon} alt="" className="h-4 w-4" aria-hidden="true" />
      </button>
      {chars.map((char) => (
        <button
          key={char}
          type="button"
          onClick={() => onInsert(char)}
          className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          {char}
        </button>
      ))}
    </div>
  );
}

function SpeedControl({ playbackRate, setPlaybackRate }) {
  const [open, setOpen] = useState(false);
  const clampRate = (value) => Math.min(1.5, Math.max(0.5, value));
  const formattedRate = `x${playbackRate.toFixed(2)}`;

  return (
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
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm cursor-pointer"
          title="Playback speed"
        >
          <img src={speedIcon} alt="" className="h-4 w-4" aria-hidden="true" />
          <span>{formattedRate}</span>
        </button>
        {open ? (
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
  );
}

export default function DictationFocus({ exercise, onAnswer, showHint }) {
  const [inputs, setInputs] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const inputRefs = useRef([]);

  const sentenceParts = useMemo(() => {
    const sentence = exercise?.focus_sentence || "";
    const parts = [];
    let lastIndex = 0;
    const regex = /\{(\d+)\}/g;
    let match;

    while ((match = regex.exec(sentence)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: sentence.slice(lastIndex, match.index) });
      }
      parts.push({ type: "blank", index: parseInt(match[1], 10) - 1 });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < sentence.length) {
      parts.push({ type: "text", content: sentence.slice(lastIndex) });
    }

    return parts;
  }, [exercise?.focus_sentence]);

  useEffect(() => {
    const blanks = sentenceParts.filter((part) => part.type === "blank").length;
    setInputs((prev) => {
      const next = [...prev];
      while (next.length < blanks) next.push("");
      if (next.length > blanks) next.length = blanks;
      return next;
    });
  }, [sentenceParts]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const focusOptions = Array.isArray(exercise?.focus_options)
    ? exercise.focus_options
    : [];
  const correctAnswers = Array.isArray(exercise?.focus_answers)
    ? exercise.focus_answers
    : [];

  const setInputValue = (index, value) => {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCheck = () => {
    if (inputs.length === 0) return;
    const normalized = inputs.map((val) => String(val || "").trim().toLowerCase());
    const correct = correctAnswers.map((val) => String(val || "").trim().toLowerCase());
    const allFilled = normalized.every((val) => val.length > 0);
    if (!allFilled) return;

    const matches = normalized.every((val, index) => val === (correct[index] || ""));
    setIsCorrect(matches);
    setSubmitted(true);

    if (matches) {
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

  const insertChar = (char) => {
    setInputValue(activeIndex, `${inputs[activeIndex] || ""}${char}`);
    const ref = inputRefs.current[activeIndex];
    if (ref) ref.focus();
  };

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

  return (
    <div className="space-y-5">
      <div className="text-left">
        <h2 className="text-2xl md:text-3xl font-normal text-slate-800 mb-2">
          {renderInlineMarkdown(exercise?.question || "Dictation (Focus)")}
        </h2>
        <p className="text-slate-500">Listen carefully and fill in the key blanks</p>
      </div>

      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="border rounded-xl p-3 bg-amber-50 text-amber-800">
          {renderInlineMarkdown(exercise.hint)}
        </div>
      ) : null}

      {exercise?.audio_url ? (
        <audio
          ref={audioRef}
          src={exercise.audio_url}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleAudio}
          className={[
            "rounded-full w-12 h-12 p-0 transition-all border cursor-pointer hover:shadow-sm disabled:cursor-default",
            isPlaying
              ? "bg-white border-[#475dd7] text-[#475dd7] hover:bg-slate-50"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
          ].join(" ")}
          title="Play audio"
          disabled={!exercise?.audio_url}
        >
          <img
            src={isPlaying ? "/static/assets/icons/pause.svg" : "/static/assets/icons/play.svg"}
            alt=""
            className="h-8 w-8 mx-auto"
            aria-hidden="true"
          />
        </button>
        <SpeedControl playbackRate={playbackRate} setPlaybackRate={setPlaybackRate} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-base text-slate-800 leading-relaxed flex flex-wrap items-center gap-2">
          {sentenceParts.map((part, idx) => {
            if (part.type === "text") {
              return <span key={`text-${idx}`}>{part.content}</span>;
            }
            const blankIndex = part.index;
            const value = inputs[blankIndex] || "";
            const correctValue = correctAnswers[blankIndex] || "";
            const showCorrect = submitted && value.trim() && value.trim().toLowerCase() === correctValue.trim().toLowerCase();
            const showWrong = submitted && value.trim() && !showCorrect;
            const isActive = !submitted && activeIndex === blankIndex;
            return (
              <input
                key={`blank-${idx}`}
                ref={(el) => {
                  inputRefs.current[blankIndex] = el;
                }}
                value={value}
                onFocus={() => setActiveIndex(blankIndex)}
                onChange={(e) => setInputValue(blankIndex, e.target.value)}
                disabled={submitted}
                placeholder={`${blankIndex + 1}`}
                className={[
                  "min-w-[80px] rounded-lg border px-3 py-1 text-sm shadow-sm",
                  showCorrect
                    ? "border-[#80ac5f] bg-[#80ac5f]/10 text-slate-800"
                    : showWrong
                    ? "border-red-400 bg-red-50 text-red-700"
                    : isActive
                    ? "border-[#475dd7] bg-white ring-2 ring-[#475dd7]/25 focus:outline-none"
                    : "border-slate-200 bg-white focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200",
                ].join(" ")}
              />
            );
          })}
        </p>

        {focusOptions.length ? (
          <div className="flex flex-wrap gap-2">
            {focusOptions.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => {
                  setInputValue(activeIndex, option);
                  const ref = inputRefs.current[activeIndex];
                  if (ref) ref.focus();
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        <AccentButtons onInsert={insertChar} />
      </div>

      {!submitted ? (
        <button
          className="px-4 py-2 rounded-xl bg-[#475dd7] text-white font-semibold shadow-sm transition hover:bg-[#3f53c4] disabled:opacity-50 cursor-pointer disabled:cursor-default"
          disabled={inputs.some((val) => !String(val || "").trim())}
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
                {isCorrect ? "Correct." : "Incorrect."}
              </span>
              {isCorrect && exercise?.correct_feedback ? (
                <span className="text-sm text-slate-600">
                  {renderInlineMarkdown(exercise.correct_feedback)}
                </span>
              ) : null}
              {!isCorrect && exercise?.incorrect_feedback ? (
                <span className="text-sm text-slate-600">
                  {renderInlineMarkdown(exercise.incorrect_feedback)}
                </span>
              ) : null}
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
              <img src="/static/assets/icons/next.svg" alt="" aria-hidden="true" className="h-10 w-10" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
