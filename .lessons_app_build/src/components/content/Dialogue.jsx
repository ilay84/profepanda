import { useEffect, useMemo, useRef, useState } from "react";
import speedIcon from "../../assets/icons/lessons/speed.svg";
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


export default function Dialogue({ exercise, onAnswer }) {
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [visibleLines, setVisibleLines] = useState([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslations, setShowTranslations] = useState({});
  const [dialogComplete, setDialogComplete] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const audioRefs = useRef({});
  const containerRef = useRef(null);

  const speakers = useMemo(() => {
    const raw = exercise?.dialog_speakers || [];
    if (raw.length) return raw;
    return [
      { name: "Speaker 1", avatar_url: "" },
      { name: "Speaker 2", avatar_url: "" },
    ];
  }, [exercise]);

  const lines = useMemo(() => exercise?.dialog_lines || [], [exercise]);

  useEffect(() => {
    if (isAutoPlaying && currentLineIndex < lines.length - 1) {
      const timer = setTimeout(() => {
        playNextLine();
      }, currentLineIndex === -1 ? 500 : 800);
      return () => clearTimeout(timer);
    }

    if (currentLineIndex >= lines.length - 1 && visibleLines.length === lines.length) {
      setDialogComplete(true);
      setIsAutoPlaying(false);
    }
  }, [currentLineIndex, isAutoPlaying, visibleLines.length, lines.length]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines.length]);

  const clampRate = (value) => Math.min(1.5, Math.max(0.5, value));
  const formattedRate = `x${playbackRate.toFixed(2)}`;

  useEffect(() => {
    Object.values(audioRefs.current || {}).forEach((audio) => {
      if (audio) {
        audio.playbackRate = playbackRate;
      }
    });
  }, [playbackRate]);

  const playLineAudio = async (index) => {
    const audio = audioRefs.current[index];
    if (!audio) return;
    setIsPlaying(true);
    try {
      audio.currentTime = 0;
      audio.playbackRate = playbackRate;
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const playNextLine = () => {
    const nextIndex = currentLineIndex + 1;
    if (nextIndex < lines.length) {
      setCurrentLineIndex(nextIndex);
      setVisibleLines((prev) => [...prev, nextIndex]);

      const line = lines[nextIndex];
      if (line?.audio_url) {
        playLineAudio(nextIndex);
      }
    }
  };

  const handleAudioEnded = (index) => {
    setIsPlaying(false);
    if (isAutoPlaying && index === currentLineIndex) {
      // autoplay continues via useEffect
    }
  };

  const toggleLineTranslation = (index) => {
    setShowTranslations((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const replayLine = (index) => {
    playLineAudio(index);
  };

  const restartDialog = () => {
    setCurrentLineIndex(-1);
    setVisibleLines([]);
    setDialogComplete(false);
    setIsAutoPlaying(true);
    setShowTranslations({});
  };

  const handleContinue = () => {
    onAnswer(true);
  };

  const getInitials = (name) => {
    return String(name || "")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  return (
    <div className="space-y-4">
      <div className="text-left mb-2">
        <div className="inline-flex items-center gap-2 bg-violet-100 px-4 py-2 rounded-full mb-2">
          <span className="text-sm font-medium text-violet-600">Dialogue</span>
        </div>
        {exercise?.question && (
          <h2 className="text-lg font-normal text-slate-600">
            {renderInlineMarkdown(exercise.question)}
          </h2>
        )}
      </div>
      <PromptImage src={exercise?.prompt_image_url} />

      <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl">
        {speakers.map((speaker, idx) => (
          <div
            key={idx}
            className={cn("flex items-center gap-2", idx === 1 && "flex-row-reverse")}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              {speaker.avatar_url ? (
                <img src={speaker.avatar_url} alt={speaker.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-slate-500">{getInitials(speaker.name)}</span>
              )}
            </div>
            <span className="text-sm font-medium text-slate-600">{speaker.name}</span>
          </div>
        ))}
      </div>

      {lines.map((line, index) =>
        line.audio_url ? (
          <audio
            key={index}
            ref={(el) => {
              audioRefs.current[index] = el;
            }}
            src={line.audio_url}
            onEnded={() => handleAudioEnded(index)}
            className="hidden"
          />
        ) : null
      )}

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
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
            <div className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
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
      </div>

      <div
        ref={containerRef}
        className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3"
      >
        {visibleLines.map((lineIndex) => {
          const line = lines[lineIndex];
          const speaker = speakers[line?.speaker_index] || speakers[0];
          const isRight = line?.speaker_index === 1;
          const showTrans = showTranslations[lineIndex];

          return (
            <div
              key={lineIndex}
              className={cn("flex gap-2", isRight ? "flex-row-reverse" : "flex-row")}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 flex items-center justify-center">
                {speaker?.avatar_url ? (
                  <img src={speaker.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-500">{getInitials(speaker?.name)}</span>
                )}
              </div>

              <div className={cn("max-w-[75%] space-y-1", isRight && "items-end")}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 shadow-sm",
                    isRight
                      ? "bg-[#475dd7] text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  )}
                >
                  <p className="text-base leading-relaxed">{line?.text || ""}</p>
                </div>

                {showTrans && line?.translation ? (
                  <div className={cn("px-2", isRight && "text-right")}>
                    <p className="text-sm text-slate-500 italic">{line.translation}</p>
                  </div>
                ) : null}

                {dialogComplete ? (
                  <div className={cn("flex gap-1", isRight ? "justify-end" : "justify-start")}>
                    {line?.audio_url ? (
                      <button
                        type="button"
                        onClick={() => replayLine(lineIndex)}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Play audio"
                      >
                        <img
                          src="/static/assets/icons/play.svg"
                          alt=""
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </button>
                    ) : null}
                    {line?.translation ? (
                      <button
                        type="button"
                        onClick={() => toggleLineTranslation(lineIndex)}
                        className={cn(
                          "p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer",
                          showTrans ? "text-blue-500" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Translation
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {isAutoPlaying && !dialogComplete && visibleLines.length < lines.length ? (
          <div className="flex justify-center py-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-slate-300"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {dialogComplete ? (
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={restartDialog}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            disabled={isPlaying}
          >
            Replay
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-xl px-6 py-2 text-sm font-semibold text-white bg-[#475dd7] hover:bg-[#3f53c4] cursor-pointer"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={playNextLine}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            disabled={isAutoPlaying || isPlaying}
          >
            Next line
          </button>
        </div>
      )}
    </div>
  );
}
