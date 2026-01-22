import { useMemo, useRef, useState } from "react";

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


function normalizeEmbedUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes("docs.google.com") && parsed.pathname.includes("/presentation/")) {
      if (!parsed.pathname.includes("/embed")) {
        return `${parsed.origin}${parsed.pathname.replace("/edit", "/embed")}`;
      }
    }
    if (parsed.hostname.includes("canva.com")) {
      const hasEmbedParam = parsed.searchParams.has("embed");
      if (!parsed.pathname.includes("/embed") && !hasEmbedParam) {
        return url.replace("/view", "/embed");
      }
    }
  } catch {
    return url;
  }
  return url;
}

function extractIframeSrc(html) {
  if (!html) return "";
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

const ASPECT_RATIOS = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};

export default function ContentEmbed({ exercise }) {
  const frameRef = useRef(null);

  const embedUrl = useMemo(() => {
    if (exercise?.embed_html) {
      const extracted = extractIframeSrc(exercise.embed_html);
      if (extracted) {
        return normalizeEmbedUrl(extracted);
      }
    }
    return normalizeEmbedUrl(exercise?.embed_url || "");
  }, [exercise?.embed_html, exercise?.embed_url]);
  const embedHtml = exercise?.embed_html || "";
  const ratioKey = exercise?.embed_aspect_ratio || "16:9";
  const ratio = ASPECT_RATIOS[ratioKey] || ASPECT_RATIOS["16:9"];
  const allowFullscreen = exercise?.embed_allow_fullscreen !== false;

  return (
    <div className="space-y-4">
      {exercise?.question ? (
        <h2 className="text-xl md:text-2xl font-normal text-slate-800">
          {renderInlineMarkdown(exercise.question)}
        </h2>
      ) : null}
      <PromptImage src={exercise?.prompt_image_url} />

      <div className="space-y-2">
        <div
          className="relative w-full"
          style={{ paddingTop: `${100 / ratio}%` }}
        >
          <div
            className="absolute inset-0 overflow-hidden"
            ref={frameRef}
          >
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={exercise?.embed_title || "Embedded content"}
                className="h-full w-full border-0"
                allow="fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen={allowFullscreen}
              />
            ) : embedHtml ? (
              <div
                className="h-full w-full"
                dangerouslySetInnerHTML={{ __html: embedHtml }}
              />
            ) : (
              <div className="h-full w-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
                Paste an embed URL to preview content.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
