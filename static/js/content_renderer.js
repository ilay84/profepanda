
// Shared renderer used by admin content lab and editor preview
(function(){
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
      case "exercise_reference": {
        const box = document.createElement("div");
        box.className = "lab-callout info";
        const title = document.createElement("div");
        title.className = "lab-callout-title";
        title.textContent = data.exercise_id || (lang === "en" ? "Exercise" : "Ejercicio");
        const meta = document.createElement("div");
        meta.className = "ppx-muted";
        meta.style.fontSize = "13px";
        meta.textContent = data.exercise_type ? `Type: ${data.exercise_type}` : (lang === "en" ? "Exercise" : "Ejercicio");
        box.appendChild(title);
        box.appendChild(meta);
        wrap.appendChild(box);
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

  window.ContentLabRenderer = { renderBlock, renderSegments, combineTranslations };
})();
