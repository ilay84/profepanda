/* static/js/ppx-json-editor.js */
(function(){
  const W = window, D = document;

  function t(es, en){
    try {
      const lang = (W.PPX_I18N && W.PPX_I18N.currentLang) || D.documentElement.getAttribute('lang') || 'es';
      return lang && String(lang).toLowerCase().startsWith('en') ? (en ?? es) : (es ?? en);
    } catch(_) { return es; }
  }

  function ensureCodeMirror(){
    if (W.CodeMirror) return Promise.resolve(W.CodeMirror);
    const cssHref = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css';
    const jsHref  = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js';
    const modeJS  = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js';
    const addonMB = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js';

    const injectCss = (href) => new Promise((res, rej) => {
      const link = D.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => res();
      link.onerror = () => rej(new Error('CSS load error'));
      D.head.appendChild(link);
    });
    const injectJs = (src) => new Promise((res, rej) => {
      const s = D.createElement('script');
      s.src = src; s.defer = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('JS load error'));
      D.head.appendChild(s);
    });

    return injectCss(cssHref)
      .catch(()=>{})
      .then(() => injectJs(jsHref))
      .then(() => injectJs(modeJS))
      .then(() => injectJs(addonMB))
      .then(() => W.CodeMirror);
  }

  function prettyJSON(value){
    try { return JSON.stringify((typeof value === 'string' ? JSON.parse(value) : value), null, 2); }
    catch(_) { return (typeof value === 'string' ? value : JSON.stringify(value)); }
  }

  function download(text, filename){
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = D.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'data.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch(_){}
  }

  function copyToClipboard(text){
    try { navigator.clipboard.writeText(text); } catch(_){}
  }

  async function open(opts){
    const {
      exerciseType = '',
      slug = '',
      title = '',
      level = '',
      initialData = {},
      validate, // (obj) => string[]
      apply     // (obj) => void
    } = opts || {};

    let initialJson = prettyJSON(initialData || {});
    const host = D.createElement('div');
    // Keep a slight gutter from the viewport scrollbar on Windows
    host.style.width = 'min(94vw, 1100px)';
    host.style.boxSizing = 'border-box';
    host.style.margin = '0 auto';
    host.style.paddingRight = '28px';
    // Fill all available vertical space inside modal body
    host.style.height = '100%';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.minHeight = '0';

    // Create a textarea fallback; CM will upgrade it
    const ta = D.createElement('textarea');
    ta.value = initialJson;
    ta.style.flex = '1 1 auto';
    ta.style.width = '100%';
    ta.style.border = '1px solid #e5e7eb';
    ta.style.borderRadius = '10px';
    ta.style.padding = '10px';
    ta.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ta.style.minHeight = '0';
    host.appendChild(ta);
    const actionBar = D.createElement('div');
    actionBar.style.display = 'flex';
    actionBar.style.justifyContent = 'flex-end';
    actionBar.style.gap = '.5rem';
    actionBar.style.marginTop = '.75rem';
    const btnCancel = D.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'ppx-btn';
    btnCancel.textContent = t('Cancelar','Cancel');
    const btnApply = D.createElement('button');
    btnApply.type = 'button';
    btnApply.className = 'ppx-btn ppx-btn--primary';
    btnApply.textContent = t('Aplicar','Apply');
    actionBar.appendChild(btnCancel);
    actionBar.appendChild(btnApply);
    host.appendChild(actionBar);
    let cm = null;

    const getVal = () => cm ? cm.getValue() : ta.value;
    const setVal = (v) => { const s = String(v); if (cm) cm.setValue(s); else ta.value = s; };

    const onFormat = () => {
      try { setVal(JSON.stringify(JSON.parse(getVal()), null, 2));
        if (W.PPXModal && typeof W.PPXModal.setMeta === 'function') W.PPXModal.setMeta(t('Formateado.','Formatted.'));
      } catch(_) { alert(t('JSON inválido.','Invalid JSON.')); }
    };

    const onApply = () => {
      try {
        const obj = JSON.parse(getVal());
        if (typeof validate === 'function') {
          const errs = validate(obj) || [];
          if (errs.length) { alert(errs.join('\n')); return false; }
        }
        if (typeof apply === 'function') apply(obj);
        if (W.PPXModal && typeof W.PPXModal.setMeta === 'function') W.PPXModal.setMeta(t('JSON aplicado.','JSON applied.'));
        initialJson = getVal();
        return true;
      } catch(e){
        console.error(e);
        alert(t('JSON inválido.','Invalid JSON.'));
        return false;
      }
    };

    const onCopy = () => { copyToClipboard(getVal()); if (W.PPXModal?.setMeta) W.PPXModal.setMeta(t('Copiado.','Copied.')); };
    const onDownload = () => { download(getVal(), `${exerciseType || 'exercise'}-${slug || 'edit'}.json`); };
    const close = () => { if (W.PPXModal && typeof W.PPXModal.close === 'function') W.PPXModal.close(); };
    btnCancel.addEventListener('click', () => close());
    btnApply.addEventListener('click', () => {
      if (onApply()) close();
    });

    const headerTitle = title || slug || t('Editar como JSON','Edit as JSON');
    const typeLabel = (exerciseType || '').toUpperCase();

    W.PPXModal.open({
      headerTitle,
      typeLabel,
      level,
      body: host,
      fullscreenDefault: true,
      dismiss: 'strict',
      onBeforeClose: () => {
        const current = getVal();
        if (current !== initialJson) {
          return confirm(t('Tienes cambios sin guardar. ¿Cerrar de todos modos?','You have unsaved changes. Close anyway?'));
        }
        return true;
      },
      actions: {
        left: [
          { label: t('Cancelar','Cancel'), variant: 'ghost', onClick: close }
        ],
        right: [
          { label: t('Aplicar','Apply'), variant: 'primary', onClick: () => { if (onApply()) close(); } },
          { label: t('Formatear','Format'), onClick: onFormat },
          { label: t('Copiar','Copy'), onClick: onCopy },
          { label: t('Descargar','Download'), onClick: onDownload }
        ]
      }
    });

    try {
      const CM = await ensureCodeMirror();
      if (CM && ta.parentNode) {
        cm = CM.fromTextArea(ta, {
          mode: { name: 'javascript', json: true },
          lineNumbers: true,
          smartIndent: true,
          matchBrackets: true,
          tabSize: 2,
          indentUnit: 2,
          viewportMargin: Infinity
        });
        // Ensure the editor fills the container
        try { cm.setSize('100%', '100%'); } catch(_){}
        setTimeout(() => { try { cm.refresh(); cm.focus(); } catch(_){} }, 60);
      }
    } catch (e) {
      console.warn('CodeMirror not available; using textarea.', e);
      try { ta.focus(); } catch(_){}
    }

    // Make the containing content section flex so host can stretch
    try {
      const content = host.closest('.ppx-ex__content');
      if (content) {
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.height = '100%';
        content.style.minHeight = '0';
      }
      const body = host.closest('.ppx-modal__body');
      if (body) {
        body.style.minHeight = '0';
      }
    } catch(_){}
  }

  const API = { open };
  if (!W.PPXJsonEditor) W.PPXJsonEditor = API;
})();
