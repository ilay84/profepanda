
// Shared renderer used by admin content lab and editor preview
(function(){
  const EX_SCRIPT_MAP = {
    core: '/static/js/ppx-core.js',
    mcq: '/static/js/ppx-mcq.js',
    tf: '/static/js/ppx-tf.js',
    fitb: '/static/js/ppx-fitb.js',
    ctw: '/static/js/ppx-ctw.js',
    dnd: '/static/js/ppx-dnd.js',
    dictation: '/static/js/ppx-dictation.js',
    ctc: '/static/js/ppx-ctc.js',
    matching: '/static/js/ppx-matching.js',
  };

  function loadScriptOnce(src, attrName) {
    return new Promise((resolve, reject) => {
      if (!src) { resolve(); return; }
      const attr = attrName || src;
      if (document.querySelector(`script[data-src="${attr}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.dataset.src = attr;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
      setTimeout(resolve, 1500); // failsafe
    });
  }

  async function ensureExerciseAssets(types) {
    const set = new Set(types.filter(Boolean).map(t => t.toLowerCase()));
    if (!set.size) return;
    await loadScriptOnce(EX_SCRIPT_MAP.core, "ppx-core");
    for (const t of set) {
      const src = EX_SCRIPT_MAP[t];
      if (!src) continue;
      await loadScriptOnce(src, `ppx-${t}`);
    }
  }
  function renderSegments(segments, translationText = null, ctx = null, path = "segments") {
    const span = document.createElement("span");
    if (translationText) {
      span.classList.add("lab-translation-mark");
      span.dataset.translation = translationText;
    }
    const editable = window.ContentLabEditorMode && ctx && ctx.moduleId && ctx.blockId;
    (segments || []).forEach((seg, index) => {
      const s = document.createElement("span");
      s.textContent = seg.text || "";
      if (seg.marks && seg.marks.includes("bold")) s.style.fontWeight = "700";
      if (seg.marks && seg.marks.includes("italic")) s.style.fontStyle = "italic";
      if (seg.color) s.style.color = seg.color;
      if (editable) {
        s.classList.add("ed-editable");
        s.dataset.editable = "segment";
        s.dataset.moduleId = ctx.moduleId;
        s.dataset.blockId = ctx.blockId;
        s.dataset.segIndex = String(index);
        s.dataset.segPath = path;
      }
      span.appendChild(s);
    });
    return span;
  }

  function combineTranslations(items) {
    const parts = [];
    (items || []).forEach(seg => {
      const t = seg?.translations?.en;
      if (t) parts.push(t);
    });
    return parts.join(" ").trim() || null;
  }

  function buildAudioPlayer(data) {
    if (!data?.audio?.src) return null;
    const wrap = document.createElement("div");
    wrap.className = "lab-audio";
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";
    const audio = document.createElement("audio");
    audio.src = data.audio.src;
    audio.preload = "metadata";
    audio.hidden = true;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = ">";
    btn.style.border = "1px solid #e5e7eb";
    btn.style.borderRadius = "6px";
    btn.style.padding = "4px 8px";
    btn.addEventListener("click", () => {
      if (audio.paused) {
        audio.play();
        btn.textContent = "||";
      } else {
        audio.pause();
        btn.textContent = ">";
      }
    });
    audio.addEventListener("ended", () => { btn.textContent = ">"; });
    wrap.appendChild(btn);
    wrap.appendChild(audio);
    return wrap;
  }

  function renderBlock(block, lang = "es", ctx = null) {
    const wrap = document.createElement("div");
    wrap.className = "lab-block";
    const data = block?.data || {};
    const context = ctx || {};
    if (!context.blockId) {
      context.blockId = block?.id || block?.block_id || "";
    }
    switch (block?.type) {
      case "heading": {
        const h = document.createElement("h3");
        h.style.margin = "0 0 6px 0";
        h.appendChild(renderSegments(data.segments || [], null, context, "segments"));
        wrap.appendChild(h);
        break;
      }
      case "text":
      case "rich_text": {
        const p = document.createElement("p");
        p.style.margin = "0 0 8px 0";
        const tText = combineTranslations(data.segments || []);
        p.appendChild(renderSegments(data.segments || [], tText, context, "segments"));
        wrap.appendChild(p);
        break;
      }
      case "list": {
        const list = document.createElement(data.ordered ? "ol" : "ul");
        list.style.margin = "0 0 8px 16px";
        (data.items || []).forEach((item, idx) => {
          const li = document.createElement("li");
          li.appendChild(renderSegments(item.segments || [], null, context, `items.${idx}.segments`));
          list.appendChild(li);
        });
        wrap.appendChild(list);
        break;
      }
      case "callout": {
        const div = document.createElement("div");
        div.className = `lab-callout ${block.style_variant || "info"}`;
        div.appendChild(renderSegments(data.segments || [], null, context, "segments"));
        wrap.appendChild(div);
        break;
      }
      case "table": {
        const table = document.createElement("table");
        table.className = "lab-table";
        const thead = document.createElement("thead");
        const trh = document.createElement("tr");
        (data.columns || []).forEach(col => {
          const th = document.createElement("th");
          th.textContent = col.label || "";
          trh.appendChild(th);
        });
        thead.appendChild(trh);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        (data.rows || []).forEach((row, rowIdx) => {
          const tr = document.createElement("tr");
          (data.columns || []).forEach(col => {
            const td = document.createElement("td");
            const cellSegs = (row.cells || {})[col.id] || [];
            const tText = combineTranslations(cellSegs);
            td.appendChild(renderSegments(cellSegs, tText, context, `rows.${rowIdx}.cells.${col.id}`));
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        break;
      }
      case "example_sentence": {
        const div = document.createElement("div");
        div.className = "lab-callout info";
        const primary = document.createElement("div");
        primary.style.fontWeight = "700";
        const translationText = combineTranslations(data.segments_translation || []);
        primary.appendChild(renderSegments(data.segments_primary || [], translationText, context, "segments_primary"));
        div.appendChild(primary);
        if (data.audio && data.audio.src) {
          const player = buildAudioPlayer(data);
          if (player) div.appendChild(player);
        }
        wrap.appendChild(div);
        break;
      }
      case "exercise":
      case "exercise_reference": {
        const exId = data.exercise_id || "";
        const parts = exId.split("/");
        const exType = (data.exercise_type || parts[0] || "").toLowerCase();
        const slug = parts.length > 1 ? parts.slice(1).join("/") : exId;
        const display = data.display || data.display_options || {};

        const card = document.createElement("div");
        card.className = "lab-exercise-card";

        const titleText = (display.show_title === false)
          ? ""
          : (data.title || exId || (lang === "en" ? "Exercise" : "Ejercicio"));
        if (titleText) {
          const titleEl = document.createElement("div");
          titleEl.className = "lab-exercise-title";
          titleEl.textContent = titleText;
          card.appendChild(titleEl);
        }

        const meta = document.createElement("div");
        meta.className = "lab-exercise-meta";
        meta.textContent = exType
          ? `${lang === "en" ? "Type" : "Tipo"}: ${exType} · ${slug || ""}`
          : (lang === "en" ? "Exercise" : "Ejercicio");
        card.appendChild(meta);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ppx-btn ppx-btn--primary";
        btn.textContent = lang === "en" ? "Open exercise" : "Abrir ejercicio";
        btn.disabled = !(exType && slug && window.PPX && typeof window.PPX.openExercise === "function");
        btn.addEventListener("click", () => {
          if (!window.PPX || typeof window.PPX.openExercise !== "function") return;
          window.PPX.openExercise({
            type: exType,
            slug,
            version: data.version || null,
            lang: data.overrides?.feedbackLocale || lang || "es",
            context: { source: "content_hub" }
          });
        });
        card.appendChild(btn);

        wrap.appendChild(card);
        break;
      }
      default: {
        const unknown = document.createElement("div");
        unknown.className = "lab-callout warning";
        unknown.textContent = `Unknown renderer: ${block?.type || "block"}`;
        wrap.appendChild(unknown);
      }
    }
    return wrap;
  }

  async function renderContent(doc, opts = {}) {
    const lang = (opts.lang || doc?.language || "es");
    const root = document.createElement("div");
    root.className = "lab-root";
    const modules = Array.isArray(doc?.modules) ? doc.modules : [];

    const exerciseTypes = [];
    modules.forEach(m => {
      (m.blocks || []).forEach(b => {
        if (b?.type === "exercise" || b?.type === "exercise_reference") {
          const data = b.data || {};
          const exId = data.exercise_id || "";
          const parts = exId.split("/");
          const exType = (data.exercise_type || parts[0] || "").toLowerCase();
          if (exType) exerciseTypes.push(exType);
        }
      });
    });
    ensureExerciseAssets(exerciseTypes).catch(() => {});

    modules.forEach(mod => {
      const modWrap = document.createElement("section");
      modWrap.className = "lab-module";
      modWrap.style.marginBottom = "18px";
      if (mod.title_es || mod.title_en) {
        const h = document.createElement("h2");
        h.textContent = lang === "en"
          ? (mod.title_en || mod.title_es || "")
          : (mod.title_es || mod.title_en || "");
        h.style.margin = "0 0 10px 0";
        modWrap.appendChild(h);
      }
      (mod.blocks || []).forEach(b => {
        const ctx = { moduleId: mod.module_id || mod.id || "" };
        modWrap.appendChild(renderBlock(b, lang, ctx));
      });
      root.appendChild(modWrap);
    });

    if (opts.target) {
      const el = (typeof opts.target === "string") ? document.querySelector(opts.target) : opts.target;
      if (el) {
        el.innerHTML = "";
        el.appendChild(root);
      }
    }
    return root;
  }

  window.ContentLabRenderer = { renderContent, renderBlock, renderSegments, combineTranslations };
})();
