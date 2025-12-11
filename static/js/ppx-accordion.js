// Shared accordion helper: expects <details class="ppx-acc"> with one <img.ppx-acc-ic> chevron.
(function(){
  function syncDetails(root){
    const acc = root.querySelectorAll ? root.querySelectorAll('details.ppx-acc') : [];
    acc.forEach(det => {
      const ic = det.querySelector('.ppx-acc-ic');
      const sync = ()=>{ if (ic) ic.src = det.open ? '/static/assets/icons/chevron_up.svg' : '/static/assets/icons/chevron_down.svg'; };
      det.addEventListener('toggle', sync);
      sync();
    });
  }
  document.addEventListener('DOMContentLoaded', ()=> syncDetails(document));
  // Expose for dynamic content
  window.PPXAccordions = { sync: syncDetails };
})();
