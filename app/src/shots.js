// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the words, `layout` and `grade` the look,
// and `size` the export size (e.g. 1080x1350). window.__shotReady is set
// once the scene is painted.
const SAMPLES = {
  pier: './samples/pier.jpg',
  boulevard: './samples/boulevard.jpg',
  sunset: './samples/sunset.jpg',
};

export async function runShot(shot, query, loadImage, state, redraw, setStatus, onPhotosLoaded) {
  const photoName = query.get('photo') || 'pier';
  const caption = query.get('caption') || 'Sunset Heist';
  const subtitle = query.get('sub') || 'VICE CITY · LEONIDA';
  const layout = query.get('layout') || 'grid';
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || '1080x1080';

  state.layout = layout;
  state.grade = grade;
  state.caption.text = caption;
  state.caption.sub = subtitle;
  state.exportSize = size;

  const captionInput = document.getElementById('caption');
  if (captionInput) captionInput.value = caption;
  const subtitleInput = document.getElementById('subtitle');
  if (subtitleInput) subtitleInput.value = subtitle;

  // Load every sample so the editor's photo strip is full in editor shots.
  const names = ['pier', 'boulevard', 'sunset'];
  for (const name of names) {
    try {
      state.photos.push(await loadImage(SAMPLES[name]));
    } catch {
      // A missing sample is not fatal.
    }
  }
  if (onPhotosLoaded) onPhotosLoaded();
  // The requested photo goes in the first panel; the others spread across
  // the remaining panels so multi-panel layouts show different photos.
  const picked = names.indexOf(photoName);
  state.panels.forEach((panel, i) => {
    panel.photo = picked >= 0 ? (picked + i) % state.photos.length : i % state.photos.length;
    panel.zoom = 1;
    panel.panX = 0;
    panel.panY = 0;
  });

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  }
  redraw();
  if (setStatus) setStatus('Sample photo loaded.');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
