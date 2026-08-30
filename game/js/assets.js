// ==== Загрузка манифеста и спрайтов ====
const IMG = {};
let MANIFEST = {};

export function getSprite(key) {
  const m = MANIFEST[key];
  if (!m) return null;
  return IMG[m.f] || null;
}
export function getMeta(key) { return MANIFEST[key]; }

export async function loadAssets(onProgress) {
  const resp = await fetch('assets/manifest.json');
  MANIFEST = await resp.json();
  const entries = Object.values(MANIFEST);
  // + картинки, которых может не быть в манифесте (эффекты, портреты, меню)
  const extra = ['fx/smoke.png','fx/smoke_big.png','fx/heart.png','fx/sparkle.png','fx/snowflake.png',
    'fx/leaf.png','fx/shine.png','fx/boom.png','fx/zzz.png','fx/note.png','fx/glow.png','fx/dust.png',
    'fx/pigeon_fly.png','fx/pigeon.png','fx/duck.png','fx/steam.png',
    'art/menu.png','portraits/mayor.png','portraits/assistant.png','portraits/babushka.png','portraits/reporter.png'];
  const all = entries.map(m => m.f).concat(extra);
  let done = 0;
  await Promise.all(all.map(f => new Promise(res => {
    const img = new Image();
    img.onload = () => { IMG[f] = img; done++; onProgress(done / all.length, f); res(); };
    img.onerror = () => { done++; onProgress(done / all.length, f); res(); };
    img.src = 'assets/' + f;
  })));
}

// портреты для диалогов
export function getPortrait(key) {
  return getSprite(key) || getSprite('icons.megaphone');
}

// ==== процедурные фолбэк-спрайты (если AI-листы ещё не сгенерированы) ====
export function registerSprite(key, img, ax, ay) {
  MANIFEST[key] = { f: key, w: img.width, h: img.height, ax: ax ?? img.width / 2, ay: ay ?? img.height / 2 };
  IMG[key] = img;
}

function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w || 1, h || 1); }

export function makeFallbacks() {
  if (!getSprite('fx.heart')) {
    const mk = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')); return cv; };
    registerSprite('fx.heart', mk(10, 9, c => {
      const p = (x, y, col) => px(c, x, y, 1, 1, col); const H = '#e85a8a', L = '#ff9dc0';
      [[1,1],[2,1],[6,1],[7,1],[0,2],[3,2],[5,2],[8,2]].forEach(([x, y]) => p(x, y, H));
      p(1, 2, L); p(0, 3, H); p(8, 3, H);
      for (let x = 0; x < 9; x++) p(x, 3, H);
      for (let x = 1; x < 8; x++) p(x, 4, H);
      for (let x = 2; x < 7; x++) p(x, 5, H);
      for (let x = 3; x < 6; x++) p(x, 6, H); p(4, 7, H);
    }));
    registerSprite('fx.sparkle', mk(9, 9, c => {
      px(c, 4, 0, 1, 9, '#ffe066'); px(c, 0, 4, 9, 1, '#ffe066');
      px(c, 2, 2, 1, 1, '#fff3b0'); px(c, 6, 2, 1, 1, '#fff3b0'); px(c, 2, 6, 1, 1, '#fff3b0'); px(c, 6, 6, 1, 1, '#fff3b0');
    }));
    registerSprite('fx.snowflake', mk(7, 7, c => {
      px(c, 3, 0, 1, 7, '#fff'); px(c, 0, 3, 7, 1, '#fff'); px(c, 1, 1, 1, 1, '#dff'); px(c, 5, 1, 1, 1, '#dff'); px(c, 1, 5, 1, 1, '#dff'); px(c, 5, 5, 1, 1, '#dff');
    }));
    registerSprite('fx.leaf', mk(8, 8, c => {
      px(c, 3, 0, 2, 1, '#d97a2a'); px(c, 2, 1, 4, 1, '#e8963d'); px(c, 1, 2, 6, 2, '#d97a2a'); px(c, 2, 4, 4, 2, '#b85c1e'); px(c, 3, 6, 2, 2, '#8a421a');
    }));
    registerSprite('fx.glow', mk(8, 8, c => {
      const g = c.createRadialGradient(4, 4, 0, 4, 4, 4);
      g.addColorStop(0, 'rgba(255,240,150,1)'); g.addColorStop(1, 'rgba(255,240,150,0)');
      c.fillStyle = g; c.fillRect(0, 0, 8, 8);
    }));
    registerSprite('fx.smoke', mk(12, 12, c => {
      c.fillStyle = 'rgba(190,190,200,0.8)';
      c.beginPath(); c.arc(6, 7, 4, 0, 7); c.arc(4, 5, 3, 0, 7); c.arc(8, 5, 3, 0, 7); c.fill();
    }));
    registerSprite('fx.steam', mk(10, 12, c => {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(5, 11); c.quadraticCurveTo(2, 7, 5, 5); c.quadraticCurveTo(8, 3, 5, 1); c.stroke();
    }));
    registerSprite('fx.dust', mk(10, 8, c => {
      c.fillStyle = 'rgba(180,160,120,0.7)';
      c.beginPath(); c.arc(3, 5, 2, 0, 7); c.arc(6, 4, 2, 0, 7); c.fill();
    }));
  }
  // портреты-фолбэки
  const faces = {
    'portraits.mayor': { skin: '#e8b48a', hair: '#4a3a2a', cloth: '#6a7280', extra: c => px(c, 4, 14, 16, 3, '#fff') },
    'portraits.assistant': { skin: '#f0c09a', hair: '#6a4426', cloth: '#7a4a6a', extra: c => { px(c, 6, 9, 4, 3, 'rgba(255,255,255,0.5)'); px(c, 13, 9, 4, 3, 'rgba(255,255,255,0.5)'); } },
    'portraits.babushka': { skin: '#e8c0a0', hair: '#c8524a', cloth: '#7fb548', extra: null },
    'portraits.reporter': { skin: '#e0a878', hair: '#3a3a4a', cloth: '#4a6a8a', extra: c => px(c, 5, 2, 14, 3, '#3a3a4a') },
  };
  for (const [key, f] of Object.entries(faces)) {
    if (getSprite(key)) continue;
    const cv = document.createElement('canvas'); cv.width = 24; cv.height = 24;
    const c = cv.getContext('2d');
    px(c, 0, 14, 24, 10, f.cloth);                       // одежда
    px(c, 6, 4, 12, 11, f.skin);                        // лицо
    px(c, 5, 2, 14, 4, f.hair);                         // волосы
    px(c, 4, 4, 2, 8, f.hair); px(c, 18, 4, 2, 8, f.hair);
    px(c, 8, 9, 2, 2, '#2a1c10'); px(c, 14, 9, 2, 2, '#2a1c10');   // глаза
    px(c, 10, 13, 4, 1, '#a05a4a');                     // рот
    if (f.extra) f.extra(c);
    registerSprite(key, cv);
  }
}
