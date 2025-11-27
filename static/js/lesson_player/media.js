export function resolveMedia(src) {
  if (!src) return '';
  if (src.startsWith('media:gdrive:')) {
    const id = src.split(':').pop();
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  if (src.startsWith('media:local:')) {
    return src.replace('media:local:', '/media/');
  }
  return src;
}

