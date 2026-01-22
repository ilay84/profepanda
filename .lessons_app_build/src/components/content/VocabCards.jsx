import { useRef } from "react";
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


export default function VocabCards({ exercise, showHint }) {
  const audioRefs = useRef({});
  const cards = Array.isArray(exercise?.vocab_cards) ? exercise.vocab_cards : [];

  const playAudio = (index) => {
    const audio = audioRefs.current[index];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">
          {renderInlineMarkdown(exercise?.question || "Vocabulary cards")}
        </h2>
        {showHint && exercise?.hint ? (
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        ) : null}
      </div>

      <PromptImage src={exercise?.prompt_image_url} />

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No vocab cards yet.
        </div>
      ) : (
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:gap-4">
          {cards.map((card, index) => {
            const label = String(card?.label ?? "");
            const imageUrl = String(card?.image_url ?? "");
            const audioUrl = String(card?.audio_url ?? "");

            return (
              <div
                key={`vocab-card-${index}`}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900 sm:text-base">
                    {label ? renderInlineMarkdown(label) : "Untitled"}
                  </div>
                  {audioUrl ? (
                    <button
                      type="button"
                      onClick={() => playAudio(index)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:ring-2 hover:ring-[#c6cdfb] cursor-pointer sm:h-8 sm:w-8"
                      title="Play audio"
                      aria-label="Play audio"
                    >
                      <img src="/static/assets/icons/play.svg" alt="" className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <div className="w-full overflow-hidden rounded-xl bg-transparent aspect-square max-h-36 sm:max-h-40">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={label || "Vocabulary image"}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                {audioUrl ? (
                  <audio
                    ref={(node) => {
                      if (node) audioRefs.current[index] = node;
                    }}
                    src={audioUrl}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
