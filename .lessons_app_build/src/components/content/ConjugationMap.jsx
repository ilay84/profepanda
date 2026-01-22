import { useEffect, useMemo, useState } from "react";

import nextIcon from "../../assets/icons/lessons/next.svg";
import { playCorrectSoundThen, playIncorrectSound } from "../../utils/sound.js";
import PandaSprite from "./PandaSprite.jsx";
import PromptImage from "./PromptImage.jsx";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text) {
  const lines = String(text || "").split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "---") {
        return '<hr class="my-3 border-slate-200" />';
      }
      const parts = line.split(/(`[^`]*`)/g);
      return parts
        .map((part) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            return `<span class="font-semibold text-[#475dd7]">${escapeHtml(
              part.slice(1, -1)
            )}</span>`;
          }
          let escaped = escapeHtml(part);
          escaped = escaped.replace(
            /\*\*([^*]+)\*\*/g,
            '<strong class="font-semibold text-slate-900">$1</strong>'
          );
          escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
          return escaped;
        })
        .join("");
    })
    .join("<br />");
}

function renderMarkdown(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (/^[-*_]{3,}$/.test(line)) {
      closeList();
      out.push('<hr class="my-3 border-slate-200" />');
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = renderInlineMarkdown(headingMatch[2]);
      const classes =
        level === 1
          ? "text-xl font-semibold text-slate-900"
          : level === 2
          ? "text-lg font-semibold text-slate-900"
          : "text-base font-semibold text-slate-900";
      out.push(`<h${level} class="${classes}">${content}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1">');
        inList = true;
      }
      out.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p class="leading-relaxed">${renderInlineMarkdown(line)}</p>`);
  }

  closeList();
  return out.join("");
}

function splitConjugationParts(value) {
  const parts = [];
  const text = String(value || "");
  const regex = /`([^`]*)`/g;
  let lastIndex = 0;
  let match = null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isEnding: false });
    }
    parts.push({ text: match[1], isEnding: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isEnding: false });
  }

  return parts.length ? parts : [{ text, isEnding: false }];
}

function stripConjugationMarkup(value) {
  return String(value || "").replace(/`/g, "");
}

export default function ConjugationMap({ exercise, onAnswer, showHint }) {
  const [filledSlots, setFilledSlots] = useState({});
  const [usedForms, setUsedForms] = useState(new Set());
  const [activeSlotId, setActiveSlotId] = useState("");
  const [wrongForm, setWrongForm] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [audioLocked, setAudioLocked] = useState(false);

  const groups = Array.isArray(exercise?.groups) ? exercise.groups : [];
  const poolForms = useMemo(() => {
    const forms = [...(exercise?.pool_forms || [])];
    if (exercise?.shuffle_pool === false) return forms;
    return forms.sort(() => Math.random() - 0.5);
  }, [exercise?.pool_forms, exercise?.shuffle_pool]);

  const allSlots = useMemo(
    () => groups.flatMap((group) => group?.slots || []),
    [groups]
  );

  useEffect(() => {
    if (!allSlots.length) return;
    const firstUnfilled = allSlots.find((slot) => !filledSlots[slot.slot_id]);
    if (!firstUnfilled) return;
    if (!activeSlotId || filledSlots[activeSlotId]) {
      setActiveSlotId(firstUnfilled.slot_id);
    }
  }, [allSlots, filledSlots, activeSlotId]);

  useEffect(() => {
    if (!allSlots.length) return;
    if (Object.keys(filledSlots).length === allSlots.length) {
      setIsComplete(true);
    }
  }, [filledSlots, allSlots]);

  const normalizeForm = (value) =>
    stripConjugationMarkup(value).toLowerCase().trim();

  const handleFormClick = (form) => {
    if (!activeSlotId || usedForms.has(form)) return;
    const activeSlot = allSlots.find((slot) => slot.slot_id === activeSlotId);
    if (!activeSlot) return;

    const accepted = Array.isArray(activeSlot.accepted_forms)
      ? activeSlot.accepted_forms
      : [];
    const isCorrect = accepted.some(
      (entry) => normalizeForm(entry) === normalizeForm(form)
    );

    if (isCorrect) {
      setFilledSlots((prev) => ({ ...prev, [activeSlotId]: form }));
      setUsedForms((prev) => new Set([...prev, form]));
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
      setWrongForm(form);
      playIncorrectSound();
      setTimeout(() => setWrongForm(""), 500);
    }
  };

  const handleSlotClick = (slotId) => {
    if (filledSlots[slotId]) return;
    setActiveSlotId(slotId);
  };

  const renderForm = (value, highlightEnding) => {
    const parts = splitConjugationParts(value);
    return parts.map((part, index) => {
      if (!part.isEnding) {
        return <span key={`${value}-part-${index}`}>{part.text}</span>;
      }
      return (
        <span
          key={`${value}-part-${index}`}
          className={cn(
            "font-semibold",
            highlightEnding ? "text-[#475dd7] underline" : "text-slate-600"
          )}
        >
          {part.text}
        </span>
      );
    });
  };

  const introHtml = useMemo(() => {
    if (!exercise?.intro_markdown) return "";
    return renderMarkdown(exercise.intro_markdown);
  }, [exercise?.intro_markdown]);

  const completionHtml = useMemo(() => {
    if (!exercise?.completion_message_markdown) return "";
    return renderMarkdown(exercise.completion_message_markdown);
  }, [exercise?.completion_message_markdown]);

  return (
    <div className="space-y-6">
      {exercise?.title ? (
        <div className="text-center">
          <h2
            className="text-2xl md:text-3xl font-bold text-slate-800"
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(exercise.title) }}
          />
        </div>
      ) : null}
      <PromptImage src={exercise?.prompt_image_url} />

      {introHtml ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700"
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
      ) : null}

      {showHint && exercise?.hint ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5">?</span>
          <div
            className="text-amber-800"
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(exercise.hint) }}
          />
        </div>
      ) : null}

      {isComplete ? (
        <div className="flex items-start gap-4">
          <PandaSprite variant="correct" />
          <div
            className={cn(
              "rounded-2xl border border-[#80ac5f]/40 bg-[#80ac5f]/10 p-6 text-left flex-1",
              "flex items-center justify-between gap-4"
            )}
          >
            <div className="min-w-0">
              {completionHtml ? (
                <div
                  className="text-slate-700"
                  dangerouslySetInnerHTML={{ __html: completionHtml }}
                />
              ) : (
                <p className="text-slate-700 font-medium">Perfect. Nicely done.</p>
              )}
            </div>
            <button
              type="button"
              title="Continue"
              aria-label="Continue"
              onClick={() => onAnswer(true)}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
                audioLocked
                  ? "cursor-default opacity-60"
                  : "cursor-pointer hover:bg-black/5 hover:scale-105",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              )}
              disabled={audioLocked}
            >
              <img src={nextIcon} alt="" aria-hidden="true" className="h-10 w-10" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group, groupIdx) => (
            <div
              key={group.group_id || `group-${groupIdx}`}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {group.group_title ? (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {group.group_title}
                  </h3>
                </div>
              ) : null}
              <div className="divide-y divide-slate-100">
                {(group.slots || []).map((slot) => {
                  const slotId = slot.slot_id;
                  const isFilled = Boolean(filledSlots[slotId]);
                  const isActive = activeSlotId === slotId && !isFilled;
                  const filledForm = filledSlots[slotId];

                  return (
                    <div
                      key={slotId}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between transition-colors",
                        isActive && "bg-[#475dd7]/5"
                      )}
                    >
                      <div className="flex flex-wrap gap-2 md:w-1/3">
                        {(slot.subjects || []).map((subject, idx) => (
                          <button
                            key={`${slotId}-subject-${idx}`}
                            type="button"
                            onClick={() => handleSlotClick(slotId)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                              isFilled
                                ? "bg-[#80ac5f]/15 text-[#2f5d22]"
                                : isActive
                                ? "bg-[#475dd7]/20 text-[#475dd7]"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                              !isFilled && "cursor-pointer"
                            )}
                          >
                            {subject}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1">
                        {isFilled ? (
                          <div className="inline-flex items-center gap-2 rounded-xl bg-[#80ac5f] px-4 py-2 text-white font-semibold">
                            <span>{renderForm(filledForm, true)}</span>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-dashed px-6",
                              isActive
                                ? "border-[#475dd7] bg-[#475dd7]/10 text-[#475dd7]"
                                : "border-slate-200 bg-slate-50 text-slate-400"
                            )}
                          >
                            <span className="text-sm font-semibold">Select a form</span>
                          </div>
                        )}
                      </div>

                      {slot.slot_note_markdown ? (
                        <div
                          className="text-xs text-slate-500 md:max-w-[200px]"
                          dangerouslySetInnerHTML={{
                            __html: renderInlineMarkdown(slot.slot_note_markdown),
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap justify-center gap-3">
            {poolForms.map((form, idx) => {
              const isUsed = usedForms.has(form);
              const isWrong = wrongForm === form;
              return (
                <button
                  key={`${form}-${idx}`}
                  type="button"
                  onClick={() => handleFormClick(form)}
                  disabled={isUsed}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium border-2 transition-all",
                    "shadow-sm",
                    isUsed
                      ? "bg-slate-100 text-slate-300 border-slate-200 line-through cursor-not-allowed"
                      : "bg-white border-slate-200 text-slate-700 hover:border-[#475dd7] hover:bg-[#475dd7]/5 cursor-pointer",
                    isWrong && "border-red-400 bg-red-50 text-red-600"
                  )}
                >
                  {renderForm(form, false)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
