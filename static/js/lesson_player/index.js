import { loadLesson } from './loader.js';
import { renderLesson } from './renderer.js';
import { setupControls } from './controls.js';

async function boot() {
  const shell = document.querySelector('.lp-shell');
  if (!shell) return;
  const slug = shell.dataset.lessonSlug;
  const params = new URLSearchParams(location.search);
  const isEdit = params.get('edit') === '1';
  shell.__lp_edit = isEdit;
  try {
    const lesson = await loadLesson(slug);
    // Normalize slides shape defensively
    if (!Array.isArray(lesson.slides)) {
      if (lesson.slides && Array.isArray(lesson.slides.items)) {
        lesson.slides = lesson.slides.items;
      } else if (lesson.slides && typeof lesson.slides === 'object') {
        lesson.slides = Object.values(lesson.slides);
      } else {
        lesson.slides = [];
      }
    }
    renderLesson(shell, lesson);
    setupControls(shell, lesson);
  } catch (err) {
    console.error('Failed to load lesson', err);
    const vp = document.querySelector('.lp-viewport');
    if (vp) vp.innerHTML = '<div class="lp-card">No se pudo cargar la lección.</div>';
  }
}

boot();
