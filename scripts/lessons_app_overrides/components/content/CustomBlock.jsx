import { useEffect, useMemo, useRef, useState } from "react";

const BASE_CSS = `
  :root {
    --pp-brand: #475dd7;
    --pp-muted: #64748b;
    --pp-border: #e2e8f0;
    --pp-bg: #ffffff;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: "Poppins", "Nunito", system-ui, -apple-system, sans-serif;
    color: #0f172a;
    background: transparent;
  }
  img, svg, video {
    max-width: 100%;
    height: auto;
  }
  .pp-custom-root {
    padding: 4px 6px;
  }
  .pp-card {
    background: transparent;
    border: 0;
    border-radius: 16px;
    padding: 16px;
    box-shadow: none;
  }
  .pp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    padding: 10px 16px;
    border: 1px solid var(--pp-border);
    background: var(--pp-brand);
    color: #fff;
    font-weight: 600;
  }
  .pp-muted {
    color: var(--pp-muted);
  }
`;

function safeScript(value) {
  return String(value || "").replace(/<\/script>/gi, "<\\/script>");
}

export default function CustomBlock({ exercise }) {
  const frameRef = useRef(null);
  const [frameHeight, setFrameHeight] = useState(200);

  const srcDoc = useMemo(() => {
    const html = safeScript(exercise?.custom_html || "");
    const css = safeScript(exercise?.custom_css || "");
    const js = safeScript(exercise?.custom_js || "");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${BASE_CSS}\n${css}</style>
  </head>
  <body>
    <div class="pp-custom-root">${html}</div>
    <script>
      const sendHeight = () => {
        const height = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
        parent.postMessage({ type: "pp-custom-block-height", height }, "*");
      };
      const observer = new ResizeObserver(sendHeight);
      observer.observe(document.body);
      window.addEventListener("load", () => {
        sendHeight();
        setTimeout(sendHeight, 50);
      });
    </script>
    <script>${js}</script>
  </body>
</html>`;
  }, [exercise?.custom_html, exercise?.custom_css, exercise?.custom_js]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (!frameRef.current) return;
      if (event.source !== frameRef.current.contentWindow) return;
      if (event.data?.type !== "pp-custom-block-height") return;
      const nextHeight = Number(event.data.height);
      if (!Number.isFinite(nextHeight)) return;
      setFrameHeight(Math.max(120, nextHeight));
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="rounded-2xl border border-transparent bg-transparent shadow-none overflow-hidden">
      <iframe
        ref={frameRef}
        title="Custom block"
        sandbox="allow-scripts allow-same-origin"
        className="w-full"
        style={{ height: `${frameHeight}px` }}
        srcDoc={srcDoc}
      />
    </div>
  );
}
