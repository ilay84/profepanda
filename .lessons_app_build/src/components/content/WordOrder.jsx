import { useMemo, useState } from "react";
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


export default function WordOrder({ exercise, onAnswer, showHint }) {
  const [selectedWords, setSelectedWords] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);

  const allWords = useMemo(() => {
    const words = [
      ...(exercise.word_order_words || []),
      ...(exercise.word_order_decoys || []),
    ];
    return [...words].sort(() => Math.random() - 0.5);
  }, [exercise.word_order_words, exercise.word_order_decoys]);

  const correctAnswer = exercise.word_order_words || [];
  const feedbackText = isCorrect
    ? exercise?.correct_feedback || ""
    : exercise?.incorrect_feedback || "";

  const handleWordClick = (word, index) => {
    if (submitted) return;
    const usedIndices = selectedWords.map((w) => w.index);
    if (usedIndices.includes(index)) return;
    setSelectedWords([...selectedWords, { word, index }]);
  };

  const handleRemoveWord = (position) => {
    if (submitted) return;
    setSelectedWords(selectedWords.slice(0, position));
  };

  const handleReset = () => {
    setSelectedWords([]);
  };

  const handleCheck = () => {
    const userAnswer = selectedWords.map((w) => w.word);
    const correct = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
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

  const isWordUsed = (index) => {
    return selectedWords.some((w) => w.index === index);
  };

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h2 className="text-2xl md:text-3xl font-normal text-slate-800 mb-2">
          {renderInlineMarkdown(exercise.question || "Arrange the words")}
        </h2>
        <p className="text-slate-500">Tap the words in the correct order</p>
      </div>
      <PromptImage src={exercise?.prompt_image_url} />

      {showHint && exercise.hint && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="h-5 w-5 rounded-full bg-amber-200 mt-0.5" />
          <p className="text-amber-800">{renderInlineMarkdown(exercise.hint)}</p>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl p-4 min-h-[100px] border-2 border-dashed border-slate-200">
        <div className="flex flex-wrap gap-2 items-center">
          {selectedWords.map((item, index) => {
            const showCorrect = submitted && item.word === correctAnswer[index];
            const showWrong = submitted && item.word !== correctAnswer[index];

            return (
              <button
                key={`${item.word}-${index}`}
                type="button"
                onClick={() => handleRemoveWord(index)}
                disabled={submitted}
                className={[
                  "px-4 py-2 rounded-lg text-base font-medium transition-all cursor-pointer disabled:cursor-default",
                  !submitted && "bg-[#475dd7] text-white hover:bg-[#3f53c4]",
                  showCorrect && "bg-[#80ac5f] text-white",
                  showWrong && "bg-red-500 text-white",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.word}
              </button>
            );
          })}

          {!submitted && selectedWords.length < correctAnswer.length && (
            <div className="w-0.5 h-8 bg-[#475dd7] rounded-full animate-pulse" />
          )}

          {selectedWords.length === 0 && !submitted && (
            <span className="text-slate-400 text-sm">
              Tap words below to build the sentence...
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {allWords.map((word, index) => {
          const used = isWordUsed(index);
          return (
            <button
              key={`${word}-${index}`}
              type="button"
              onClick={() => handleWordClick(word, index)}
              disabled={submitted || used}
              className={[
                "px-4 py-2 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer disabled:cursor-default",
                "border-2 shadow-sm",
                !used && !submitted &&
                  "bg-white border-slate-200 hover:border-[#475dd7] hover:bg-indigo-50",
                used && "opacity-30 border-slate-200 bg-slate-100",
                submitted && "opacity-50 cursor-default",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {word}
            </button>
          );
        })}
      </div>

      {!submitted && selectedWords.length > 0 && (
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
                <p className="text-red-600 text-sm">
                  Correct order: <strong>{correctAnswer.join(" ")}</strong>
                </p>
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
            disabled={selectedWords.length === 0}
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
