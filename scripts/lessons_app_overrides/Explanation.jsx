import { useMemo } from "react";
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
      escaped = escaped.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_m, label, url) =>
          `<a class="text-indigo-600 hover:text-indigo-700 underline" href="${escapeHtml(
            url
          )}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
      );
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      return escaped;
    })
    .join("");
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

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      const classes =
        level === 1
          ? "text-2xl font-bold text-slate-900"
          : level === 2
          ? "text-xl font-semibold text-slate-900"
          : "text-lg font-semibold text-slate-900";
      out.push(`<h${level} class="${classes}">${content}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1">');
        inList = true;
      }
      out.push(`<li>${renderInline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p class="leading-relaxed">${renderInline(line)}</p>`);
  }

  closeList();
  return out.join("");
}

export default function Explanation({ exercise, onAnswer }) {
  const html = useMemo(() => {
    const content = exercise?.explanation_content || "";
    return content.trim().length
      ? renderMarkdown(content)
      : '<p class="leading-relaxed text-slate-500">Add explanation content.</p>';
  }, [exercise?.explanation_content]);

  return (
    <div className="space-y-4">
      {exercise?.question && (
        <h2
          className="text-xl font-bold text-slate-800"
          dangerouslySetInnerHTML={{ __html: renderInline(exercise.question) }}
        />
      )}
      <PromptImage src={exercise?.prompt_image_url} />

      <div
        className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700 space-y-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <button
        className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
        onClick={() => onAnswer(true)}
      >
        Continue
      </button>
    </div>
  );
}
