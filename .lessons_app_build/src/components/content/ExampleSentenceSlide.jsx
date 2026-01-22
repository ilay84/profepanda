import { useEffect, useMemo, useRef, useState } from "react";
import nextIcon from "../../assets/icons/lessons/next.svg";
import speedIcon from "../../assets/icons/lessons/speed.svg";
import PromptImage from "./PromptImage.jsx";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text) {
  const parts = String(text).split(/(`[^`]*`)/g);
  return parts
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return `<code class="rounded bg-slate-100 px-1 py-0.5 text-sm">${escapeHtml(
          part.slice(1, -1)
        )}</code>`;
      }
      let escaped = escapeHtml(part);
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-[#475dd7]">$1</strong>');
      escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      return escaped;
    })
    .join("");
}

function renderMarkdown(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    out.push(`<p class="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed mb-0">${renderInline(line)}</p>`);
  }

  return out.join("");
}

export default function ExampleSentenceSlide({ exercise, onAnswer }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const audioRef = useRef(null);

  const clampRate = (value) => Math.min(1.5, Math.max(0.5, value));
  const formattedRate = `x${playbackRate.toFixed(2)}`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (exercise?.audio_url && audioRef.current) {
      const playAudio = async () => {
        try {
          audioRef.current.playbackRate = playbackRate;
          await audioRef.current.play();
          setIsPlaying(true);
        } catch {
          // Autoplay blocked, user will need to click
        }
      };
      playAudio();
    }
  }, [exercise?.audio_url, playbackRate]);

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

  const handleContinue = () => {
    onAnswer(true);
  };

  const sentenceHtml = useMemo(() => {
    const text = exercise?.sentence_text || "";
    return text.trim().length
      ? renderMarkdown(text)
      : '<p class="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed mb-0">Example sentence</p>';
  }, [exercise?.sentence_text]);

  return (
    <div className="space-y-6">
      <div className="text-left mb-4">
        <div className="inline-flex items-center gap-2 bg-teal-100 px-4 py-2 rounded-full mb-4">
          <span className="text-sm font-medium text-teal-600">Example</span>
        </div>
        {exercise?.question && (
          <h2
            className="text-xl font-normal text-slate-600"
            dangerouslySetInnerHTML={{ __html: renderInline(exercise.question) }}
          />
        )}
      </div>
      <PromptImage src={exercise?.prompt_image_url} />

      {exercise?.audio_url ? (
        <audio
          ref={audioRef}
          src={exercise.audio_url}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      ) : null}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-visible relative">
        <div className="p-8 text-left">
          <div
            className="prose prose-xl prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: sentenceHtml }}
          />
        </div>

        {exercise?.sentence_translation ? (
          <div
            className={
              "overflow-hidden bg-slate-50 border-t border-slate-100 " +
              (showTranslation ? "opacity-100" : "opacity-0 h-0")
            }
          >
            <div className="p-6 text-left">
              <p className="text-lg text-slate-600">{exercise.sentence_translation}</p>
            </div>
          </div>
        ) : null}

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 overflow-visible">
          <div className="flex items-center justify-center gap-3">
            {exercise?.audio_url ? (
              <button
                type="button"
                onClick={toggleAudio}
                className={
                  "rounded-full w-14 h-14 p-0 transition-all border cursor-pointer hover:shadow-sm " +
                  (isPlaying
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")
                }
              >
                <img
                  src="/static/assets/icons/play.svg"
                  alt=""
                  className="h-8 w-8 mx-auto"
                  aria-hidden="true"
                />
              </button>
            ) : null}

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

            {exercise?.sentence_translation ? (
              <button
                type="button"
                onClick={() => setShowTranslation(!showTranslation)}
                className={
                  "rounded-full w-14 h-14 p-0 transition-all border cursor-pointer " +
                  (showTranslation
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-slate-200 text-slate-600")
                }
                title="Translate"
              >
                <img
                  src="/static/assets/icons/globe.svg"
                  alt=""
                  className="h-6 w-6 mx-auto"
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>

          {/* Mobile speed control now lives inline with the audio button */}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-slate-700">Continue</span>
        <button
          type="button"
          title="Continue"
          aria-label="Continue"
          onClick={handleContinue}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition cursor-pointer hover:bg-black/5 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <img src={nextIcon} alt="" aria-hidden="true" className="h-10 w-10" />
        </button>
      </div>
    </div>
  );
}
