import { useRef, useState } from "react";

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


function StyledAnswer({ stem, ending }) {
  if (!stem && !ending) return null;
  return (
    <span className="text-base text-slate-800 font-semibold">
      {stem ? <span>{stem}</span> : null}
      {ending ? (
        <span className="underline text-[#475dd7] font-semibold">{ending}</span>
      ) : null}
    </span>
  );
}

const ACCENT_CHARS = ["á", "é", "í", "ó", "ú", "ö", "ü", "ñ"];

function AccentButtons({ onInsert }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ACCENT_CHARS.map((char) => (
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

export default function ConjugationDrill({ exercise, onAnswer, showHint }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);
  const inputRef = useRef(null);

  const correctAnswer = String(exercise?.correct_answer || "").trim();
  const feedbackText = isCorrect
    ? exercise?.correct_feedback || ""
    : exercise?.incorrect_feedback || "";

  const handleCheck = () => {
    const user = String(answer || "").trim().toLowerCase();
    const correct = correctAnswer.toLowerCase();
    const result = user === correct;
    setIsCorrect(result);
    setSubmitted(true);
    if (result) {
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

  const handleInsertChar = (char) => {
    if (submitted) return;
    setAnswer((prev) => `${prev}${char}`);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h2 className="text-2xl md:text-3xl font-normal text-slate-800 mb-2">
          {renderInlineMarkdown(
            exercise.question || "Type the correct conjugation"
          )}
        </h2>
        <p className="text-slate-500">Type the conjugated form below</p>
      </div>

      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise?.hint ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="h-5 w-5 rounded-full bg-amber-200 mt-0.5" />
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-3">
        <input
          ref={inputRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          autoFocus
          className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-3 text-base text-center shadow-sm focus:border-[#475dd7] focus:outline-none focus:ring-2 focus:ring-[#475dd7]/20 disabled:bg-slate-50"
        />
        <AccentButtons onInsert={handleInsertChar} />
        {submitted ? (
          <div className="text-sm text-slate-700 space-y-1 text-center">
            {isCorrect ? (
              <div>
                {"\u2705"}{" "}
                <span className="font-semibold">
                  {exercise?.stem || exercise?.ending ? (
                    <StyledAnswer stem={exercise?.stem} ending={exercise?.ending} />
                  ) : (
                    correctAnswer
                  )}
                </span>
              </div>
            ) : (
              <>
                <div>
                  {"\u274c"}{" "}<span className="font-semibold">{answer || "-"}</span>
                </div>
                {exercise?.stem || exercise?.ending || correctAnswer ? (
                  <div>
                    {"\u2705"}{" "}
                    <span className="font-semibold">
                      {exercise?.stem || exercise?.ending ? (
                        <StyledAnswer stem={exercise?.stem} ending={exercise?.ending} />
                      ) : (
                        correctAnswer
                      )}
                    </span>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {submitted ? (
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
              <span className="font-medium text-[#2f5d22]">Correct.</span>
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
      ) : null}

      <div className="flex justify-center pt-2">
        {!submitted ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!answer.trim()}
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
