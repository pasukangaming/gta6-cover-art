// Neon Sunset Cover Studio — the editor.
// Wires the controls in index.html to the cover renderer: photos, layouts,
// per-panel crop and position, caption, grades, effects and export.
// A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
import { drawCover, defaultState, syncPanels, GRADES, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();
let selectedPanel = 0;

// The sample photos shipped with the app (free to use, made for make.fun).
const SAMPLES = [
  { name: 'Pier', url: './samples/pier.jpg' },
  { name: 'Boulevard', url: './samples/boulevard.jpg' },
  { name: 'Sunset Strip', url: './samples/sunset.jpg' },
];

const $ = (id) => document.getElementById(id);

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function setCanvasSize() {
  const [w, h] = state.exportSize.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
}

function redraw() {
  setCanvasSize();
  drawCover(canvas, state);
  syncPanelControls();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- Photo library ---------------------------------------------------------
function addPhoto(img, name) {
  state.photos.push(img);
  const index = state.photos.length - 1;
  // New photos fill the selected panel, so one click is one visible change.
  state.panels[selectedPanel].photo = index;
  renderThumbs();
  redraw();
  return index;
}

function renderThumbs() {
  const list = $('thumbs');
  list.innerHTML = '';
  const select = $('panelPhoto');
  if (select) {
    select.innerHTML = '';
    state.photos.forEach((_, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `Photo ${i + 1}`;
      select.appendChild(option);
    });
  }
  state.photos.forEach((img, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `Use photo ${i + 1} in the selected panel`;
    const thumb = document.createElement('canvas');
    thumb.width = 96;
    thumb.height = 64;
    const tctx = thumb.getContext('2d');
    const s = Math.max(96 / img.naturalWidth, 64 / img.naturalHeight);
    tctx.drawImage(img, (96 - img.naturalWidth * s) / 2, (64 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    button.appendChild(thumb);
    const label = document.createElement('span');
    label.textContent = `Photo ${i + 1}`;
    button.appendChild(label);
    button.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      redraw();
    });
    list.appendChild(button);
  });
}

async function loadSamples() {
  for (const sample of SAMPLES) {
    try {
      const img = await loadImage(sample.url);
      state.photos.push(img);
    } catch {
      // A missing sample is not fatal; the app still works with uploads.
    }
  }
  renderThumbs();
  redraw();
}

function loadUploads(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) {
    setStatus('That file is not an image — try a JPG or PNG.');
    return;
  }
  let pending = images.length;
  for (const file of images) {
    const url = URL.createObjectURL(file);
    loadImage(url)
      .then((img) => addPhoto(img, file.name))
      .catch(() => setStatus(`Could not read ${file.name}.`))
      .finally(() => {
        if (--pending === 0) setStatus(`${images.length} photo${images.length > 1 ? 's' : ''} loaded.`);
      });
  }
}

// --- Layouts ---------------------------------------------------------------
function renderLayoutButtons() {
  const wrap = $('layouts');
  const layouts = [
    ['single', '1 panel'],
    ['split-v', 'Split ·'],
    ['split-h', 'Split ='],
    ['triple', '3 panels'],
    ['grid', '2 × 2'],
    ['diagonal', 'Diagonal'],
  ];
  for (const [key, label] of layouts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.layout = key;
    button.textContent = label;
    button.addEventListener('click', () => {
      state.layout = key;
      syncPanels(state);
      selectedPanel = 0;
      document.querySelectorAll('#layouts .chip').forEach((b) => b.classList.toggle('active', b.dataset.layout === key));
      renderPanelPicker();
      redraw();
    });
    wrap.appendChild(button);
  }
  wrap.querySelector('[data-layout="grid"]').classList.add('active');
}

function renderPanelPicker() {
  const wrap = $('panelPicker');
  wrap.innerHTML = '';
  layoutPanels(state.layout).forEach((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = `Panel ${i + 1}`;
    button.addEventListener('click', () => {
      selectedPanel = i;
      renderPanelPicker();
      syncPanelControls();
    });
    if (i === selectedPanel) button.classList.add('active');
    wrap.appendChild(button);
  });
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel] || { photo: 0, zoom: 1, panX: 0, panY: 0 };
  $('panelPhoto').value = String(panel.photo);
  $('zoom').value = String(panel.zoom);
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('panX').value = String(panel.panX);
  $('panY').value = String(panel.panY);
  renderPanelPicker();
}

// --- Caption, grades, effects ----------------------------------------------
function renderGradeButtons() {
  const wrap = $('grades');
  for (const [key, grade] of Object.entries(GRADES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.grade = key;
    button.textContent = grade.label;
    button.style.background = `linear-gradient(135deg, ${grade.sky[0]}, ${grade.sky[1]}, ${grade.sky[2]})`;
    button.addEventListener('click', () => {
      state.grade = key;
      document.querySelectorAll('#grades .chip').forEach((b) => b.classList.toggle('active', b.dataset.grade === key));
      redraw();
    });
    wrap.appendChild(button);
  }
  wrap.querySelector('[data-grade="sunset"]').classList.add('active');
}

function bindControls() {
  $('photo').addEventListener('change', (e) => {
    loadUploads(e.target.files);
    e.target.value = '';
  });
  const drop = $('dropzone');
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    loadUploads(e.dataTransfer.files);
  });
  drop.addEventListener('click', () => $('photo').click());

  $('useSamePhoto').addEventListener('click', () => {
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    redraw();
    setStatus('One photo now fills every panel.');
  });
  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[selectedPanel].photo = Number(e.target.value);
    redraw();
  });
  $('zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    redraw();
  });
  $('panX').addEventListener('input', (e) => {
    state.panels[selectedPanel].panX = Number(e.target.value);
    redraw();
  });
  $('panY').addEventListener('input', (e) => {
    state.panels[selectedPanel].panY = Number(e.target.value);
    redraw();
  });
  $('fitFill').addEventListener('click', () => {
    const p = state.panels[selectedPanel];
    p.zoom = 1;
    p.panX = 0;
    p.panY = 0;
    redraw();
  });

  $('caption').addEventListener('input', (e) => {
    state.caption.text = e.target.value;
    redraw();
  });
  $('subtitle').addEventListener('input', (e) => {
    state.caption.sub = e.target.value;
    redraw();
  });
  $('capSize').addEventListener('input', (e) => {
    state.caption.size = Number(e.target.value) / 100;
    $('capSizeVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('capColor').addEventListener('input', (e) => {
    state.caption.color = e.target.value;
    redraw();
  });
  $('capPos').addEventListener('change', (e) => {
    state.caption.position = e.target.value;
    redraw();
  });
  $('capOutline').addEventListener('change', (e) => {
    state.caption.outline = e.target.checked;
    redraw();
  });

  $('gradeIntensity').addEventListener('input', (e) => {
    state.gradeIntensity = Number(e.target.value) / 100;
    $('gradeVal').textContent = `${e.target.value}%`;
    redraw();
  });
  for (const id of ['halftone', 'vignette', 'grain', 'border']) {
    $(id).addEventListener('change', (e) => {
      state[id] = e.target.checked;
      redraw();
    });
  }

  $('exportSize').addEventListener('change', (e) => {
    state.exportSize = e.target.value;
    redraw();
  });
  $('export').addEventListener('click', exportPng);
}

function exportPng() {
  const [w, h] = state.exportSize.split('x').map(Number);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out, state);
  out.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setStatus(`Saved cover-${w}x${h}.png — ${Math.round(blob.size / 1024)} KB.`);
  }, 'image/png');
}

// --- Boot ------------------------------------------------------------------
export { state, loadImage, redraw, exportPng };

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
renderLayoutButtons();
renderGradeButtons();
renderPanelPicker();
bindControls();

if (shot) {
  // Fixed scenes for screenshots: the shot module loads a sample photo,
  // applies the query's caption/layout/grade, and flags when painted.
  runShot(shot, params, loadImage, state, redraw, setStatus, renderThumbs);
} else {
  loadSamples();
}
