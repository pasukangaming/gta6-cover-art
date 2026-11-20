// Neon Sunset Cover Studio — the cover renderer.
// Draws a multi-panel GTA-style poster onto a canvas: the photos fill their
// panels, a sunset or neon grade washes over them, then the app's own drawn
// art (sun disc, palm silhouettes, halftone dots) and the bold caption go on
// top. Everything is drawn in code — no Rockstar logo, artwork or font.
// The drawing is deterministic: the grain uses a seeded generator, so the
// same state always paints the same pixels.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#ff9a3d', '#ff5e7a', '#8b2f8f'],
    tint: ['rgba(255,122,26,0.28)', 'rgba(214,38,120,0.34)'],
    sun: '#ffd76a',
    accent: '#ff5e7a',
  },
  neon: {
    label: 'Neon Night',
    sky: ['#2b0a54', '#7b1fa2', '#00e5ff'],
    tint: ['rgba(123,31,162,0.30)', 'rgba(0,229,255,0.22)'],
    sun: '#00e5ff',
    accent: '#ff2fb3',
  },
  noir: {
    label: 'Noir',
    sky: ['#1a1a1a', '#3a3a3a', '#6e6e6e'],
    tint: ['rgba(0,0,0,0.30)', 'rgba(255,255,255,0.06)'],
    sun: '#e8e8e8',
    accent: '#ffffff',
  },
  gold: {
    label: 'Palm Gold',
    sky: ['#ffb347', '#ff7b2f', '#7a3b00'],
    tint: ['rgba(255,179,71,0.26)', 'rgba(255,123,47,0.30)'],
    sun: '#fff3c4',
    accent: '#ffb347',
  },
};

// Panel rectangles, as fractions of the cover [x, y, w, h], plus an
// optional diagonal clip (two polygons instead of rectangles).
export function layoutPanels(layout) {
  switch (layout) {
    case 'split-v':
      return [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 },
      ];
    case 'split-h':
      return [
        { x: 0, y: 0, w: 1, h: 0.5 },
        { x: 0, y: 0.5, w: 1, h: 0.5 },
      ];
    case 'grid':
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
    case 'triple':
      return [
        { x: 0, y: 0, w: 0.62, h: 1 },
        { x: 0.62, y: 0, w: 0.38, h: 0.5 },
        { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
      ];
    case 'diagonal':
      return [
        {
          x: 0, y: 0, w: 1, h: 1,
          poly: [[0, 0], [1, 0], [0.42, 1], [0, 1]],
        },
        {
          x: 0, y: 0, w: 1, h: 1,
          poly: [[1, 0], [1, 1], [0.42, 1]],
        },
      ];
    case 'single':
    default:
      return [{ x: 0, y: 0, w: 1, h: 1 }];
  }
}

function panelCount(layout) {
  return layoutPanels(layout).length;
}

// Seeded pseudo-random, so grain is identical on every draw.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Draw one photo into a panel rect, cover-fit, with per-panel zoom and pan.
// zoom 1 = fit the panel exactly; panX/panY shift the photo by a fraction
// of the panel size.
function drawPhotoInPanel(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  if (panel.poly) {
    ctx.moveTo(panel.poly[0][0] * w + x, panel.poly[0][1] * h + y);
    for (let i = 1; i < panel.poly.length; i++) {
      ctx.lineTo(panel.poly[i][0] * w + x, panel.poly[i][1] * h + y);
    }
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const base = Math.max(w / iw, h / ih);
    const scale = base * (panel.zoom || 1);
    const pw = iw * scale;
    const ph = ih * scale;
    const ox = x + (w - pw) / 2 + (panel.panX || 0) * w;
    const oy = y + (h - ph) / 2 + (panel.panY || 0) * h;
    ctx.drawImage(img, ox, oy, pw, ph);
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3a2b4d');
    g.addColorStop(1, '#1c1426');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

// One palm silhouette, rooted at (x, y): a curved trunk and filled leaf
// blades fanning from the crown, each blade a tapered shape that droops.
function drawPalm(ctx, x, y, size, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lean, 1);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.lineCap = 'round';
  // Trunk, leaning up.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.06, -size * 0.5, size * 0.14, -size * 0.85);
  ctx.stroke();
  const topX = size * 0.14;
  const topY = -size * 0.85;
  // Fronds: each a filled blade from the crown to its drooping tip.
  const fronds = [
    [-1.0, 0.05], [-0.8, -0.35], [-0.45, -0.6],
    [0.0, -0.7], [0.45, -0.55], [0.8, -0.25], [1.0, 0.1],
  ];
  for (const [dx, dy] of fronds) {
    const len = size * 0.62;
    const tipX = topX + dx * len;
    const tipY = topY + dy * len + size * 0.28;
    const midX = topX + dx * len * 0.55;
    const midY = topY + dy * len * 0.55 - size * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + dx * len * 0.12, midY + size * 0.09, topX, topY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawHalftone(ctx, w, h, color, maxR) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(10, w * 0.018);
  for (let yy = h * 0.55; yy < h; yy += step) {
    const t = (yy - h * 0.55) / (h * 0.45);
    for (let xx = step / 2; xx < w; xx += step) {
      const r = Math.max(0.4, maxR * (0.35 + 0.65 * t));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGrain(ctx, w, h, strength) {
  const rand = seededRandom(20261120);
  ctx.save();
  ctx.globalAlpha = strength;
  for (let i = 0; i < 2600; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

// The sun disc with horizontal slats, in the grade's sun colour.
function drawSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, color);
  g.addColorStop(1, '#ff5e7a');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.0)';
  ctx.globalCompositeOperation = 'destination-out';
  let gap = r * 0.12;
  for (let yy = cy + r * 0.05; yy < cy + r; yy += gap) {
    ctx.fillRect(cx - r, yy, r * 2, gap * 0.45);
    gap *= 1.35;
  }
  ctx.restore();
}

// The full state the editor keeps. `photos` is an array of images (or null
// for an empty slot); `panels` is one entry per panel with a photo index,
// zoom and pan; `caption` holds the lettering; `grade` a GRADES key.
export function defaultState() {
  return {
    layout: 'grid',
    photos: [],
    panels: [
      { photo: 0, zoom: 1, panX: 0, panY: 0 },
      { photo: 1, zoom: 1, panX: 0, panY: 0 },
      { photo: 2, zoom: 1, panX: 0, panY: 0 },
      { photo: 0, zoom: 1, panX: 0, panY: 0 },
    ],
    caption: {
      text: 'SUNSET HEIST',
      sub: 'VICE CITY · LEONIDA',
      size: 0.115,
      color: '#ffffff',
      outline: true,
      position: 'bottom',
    },
    grade: 'sunset',
    gradeIntensity: 0.85,
    halftone: true,
    vignette: true,
    grain: true,
    border: true,
    exportSize: '1080x1080',
  };
}

// Keep the panels array in step with the layout (one entry per panel).
export function syncPanels(state) {
  const n = panelCount(state.layout);
  while (state.panels.length < n) {
    state.panels.push({ photo: state.panels.length % 3, zoom: 1, panX: 0, panY: 0 });
  }
  state.panels.length = n;
}

export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const intensity = state.gradeIntensity ?? 0.85;
  syncPanels(state);

  // Sky fallback behind the photos.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Photos, one per panel.
  const panels = layoutPanels(state.layout);
  panels.forEach((panel, i) => {
    const p = state.panels[i] || { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const img = state.photos[p.photo] || null;
    drawPhotoInPanel(ctx, img, {
      x: panel.x * w,
      y: panel.y * h,
      w: panel.w * w,
      h: panel.h * h,
    }, panel.poly ? { ...p, poly: panel.poly } : p);
  });

  // White gutters between panels.
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  for (const panel of panels) {
    if (panel.poly) continue;
    ctx.strokeRect(panel.x * w, panel.y * h, panel.w * w, panel.h * h);
  }
  if (state.layout === 'diagonal') {
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w * 0.42, h);
    ctx.stroke();
  }

  // The grade wash over everything.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.tint[0].replace(/[\d.]+\)$/, `${(0.35 * intensity).toFixed(2)})`));
  wash.addColorStop(1, grade.tint[1].replace(/[\d.]+\)$/, `${(0.85 * intensity).toFixed(2)})`));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Drawn art: a small retro sun tucked in the top-right corner, and
  // palms in the lower corners, kept short so they stay out of the caption.
  const sunR = Math.min(w, h) * 0.075;
  drawSun(ctx, w * 0.87, h * 0.12, sunR, grade.sun);
  drawPalm(ctx, w * 0.05, h * 0.99, Math.min(w, h) * 0.22, 1, 'rgba(20,8,28,0.92)');
  drawPalm(ctx, w * 0.95, h * 0.99, Math.min(w, h) * 0.18, -1, 'rgba(20,8,28,0.92)');

  if (state.halftone) drawHalftone(ctx, w, h, 'rgba(0,0,0,0.16)', Math.max(1.2, w * 0.004));
  if (state.vignette) {
    const v = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) drawGrain(ctx, w, h, 0.05);

  // Caption, bold capitals with an outline, over a soft dark band.
  // The whole block — caption lines plus subtitle — is measured first and
  // shrunk until it fits inside its band, so no line is ever clipped.
  const cap = state.caption;
  const text = (cap.text || '').trim().toUpperCase();
  if (text) {
    const family = '"Arial Black", "Archivo Black", Impact, "Helvetica Neue", sans-serif';
    const sub = (cap.sub || '').trim().toUpperCase();
    let size = h * cap.size;
    let lines = wrapText(ctx, text, family, size, w * 0.88);
    const measure = () => {
      const lineH = size * 1.06;
      const subSize = Math.max(10, size * 0.24);
      const blockH = lines.length * lineH + (sub ? subSize * 1.9 : 0);
      return { lineH, subSize, blockH };
    };
    let m = measure();
    // The band may take up to 30% of the height; shrink the type until
    // the block fits inside it with a margin.
    while (m.blockH > h * 0.27 && size > h * 0.035) {
      size *= 0.9;
      lines = wrapText(ctx, text, family, size, w * 0.88);
      m = measure();
    }
    const bandH = m.blockH + h * 0.05;
    const bandY = cap.position === 'top' ? 0 : cap.position === 'center' ? (h - bandH) / 2 : h - bandH;
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, 'rgba(10,4,18,0)');
    band.addColorStop(1, 'rgba(10,4,18,0.62)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, w, bandH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let cy = bandY + bandH / 2 - m.blockH / 2 + m.lineH / 2;
    ctx.font = `900 ${size}px ${family}`;
    for (const line of lines) {
      if (cap.outline) {
        ctx.lineWidth = Math.max(2, size * 0.09);
        ctx.strokeStyle = 'rgba(20,8,28,0.95)';
        ctx.lineJoin = 'round';
        ctx.strokeText(line, w / 2, cy);
      }
      ctx.fillStyle = cap.color || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = size * 0.12;
      ctx.shadowOffsetY = size * 0.04;
      ctx.fillText(line, w / 2, cy);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      cy += m.lineH;
    }
    // Subtitle under the caption, centred in the slot the block measured
    // for it (below the last caption line), with a small accent rule.
    if (sub) {
      const slotTop = cy - m.lineH / 2;
      ctx.font = `700 ${m.subSize}px ${family}`;
      ctx.fillStyle = grade.accent;
      ctx.fillRect(w / 2 - w * 0.06, slotTop + m.subSize * 0.15, w * 0.12, Math.max(2, m.subSize * 0.12));
      ctx.fillText(sub, w / 2, slotTop + m.subSize * 0.95);
    }
  }

  // Outer border, like a poster frame.
  if (state.border) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(4, w * 0.008);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(w * 0.02, h * 0.02, w * 0.96, h * 0.96);
  }
}

// Word-wrap `text` to fit `maxWidth` at the given font; returns the lines.
function wrapText(ctx, text, family, size, maxWidth) {
  ctx.font = `900 ${size}px ${family}`;
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
