export function renderDragBlank(shell, slide){
  const wrap = document.createElement('div');
  wrap.className = 'lp-dragblank';
  const prompt = slide.prompt || 'Arrastra las palabras al espacio';
  const text = String(slide.text||'');
  const bank = Array.isArray(slide.bank) ? slide.bank.slice() : String(slide.bank||'').split(',').map(x=>x.trim()).filter(Boolean);
  // Parse [[expected]]
  const blanks = [];
  const parts = [];
  let idx = 0; let m; let last=0;
  const re = /\[\[([^\]]+)\]\]/g;
  while ((m = re.exec(text))){
    if (m.index>last) parts.push({type:'text', value:text.slice(last,m.index)});
    parts.push({type:'blank', i:idx}); blanks.push(m[1]); idx++; last = re.lastIndex;
  }
  if (last < text.length) parts.push({type:'text', value:text.slice(last)});

  const filled = new Array(blanks.length).fill('');
  let pending = null; // selected bank token

  wrap.innerHTML = `
    <div class="lp-prompt">${escapeHtml(prompt)}</div>
    <div class="lp-dragblank__text"></div>
    <div class="lp-dragblank__bank"></div>
    <div class="lp-feedback" hidden role="status" aria-live="polite"></div>
  `;
  const textHost = wrap.querySelector('.lp-dragblank__text');
  parts.forEach(p=>{
    if (p.type==='text'){ const span=document.createElement('span'); span.textContent=p.value; textHost.appendChild(span); }
    else { const b=document.createElement('button'); b.className='lp-blank'; b.dataset.index=String(p.i); b.textContent='____';
      b.addEventListener('click', ()=>{
        const i=+b.dataset.index; if (!pending) return; filled[i]=pending; b.textContent=pending; pending=null; updateAnswered();
      }); textHost.appendChild(b); }
  });
  const bankHost = wrap.querySelector('.lp-dragblank__bank');
  bank.forEach(w=>{
    const btn=document.createElement('button'); btn.className='lp-token'; btn.textContent=w;
    btn.addEventListener('click', ()=>{ pending = w; bankHost.querySelectorAll('.lp-token').forEach(b=>b.classList.remove('is-selected')); btn.classList.add('is-selected'); });
    bankHost.appendChild(btn);
  });

  function updateAnswered(){
    try { const ok = filled.some(v=>v && v.length); shell.__lp_state.state.answered = ok; shell.dispatchEvent(new Event('lp:answered')); } catch{}
  }

  wrap.__grade = function(){
    const fb = wrap.querySelector('.lp-feedback');
    let ok = true; for (let i=0;i<blanks.length;i++){ if ((filled[i]||'').trim() !== (blanks[i]||'').trim()) { ok=false; break; } }
    fb.hidden = false; fb.textContent = ok ? '¡Correcto!' : 'Revisa los espacios';
    return ok;
  };
  return wrap;
}

function escapeHtml(s=''){return s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

