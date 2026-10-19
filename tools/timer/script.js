(() => {
  /* ===== 設定 ===== */
  // 角度は canvas 基準（0 = 右、時計回り正）。stops は中心から時計回りに並ぶ 0〜1。
  const WALLPAPER = {
    dark:  { start: 0, stops: [[0, '#000000'], [0.5, '#003893'], [0.95, '#75FFF8'], [1, '#75FFF8']] },
    light: { start: 0, stops: [[0, '#FFFFFF'], [0.3, '#FFFFFF'], [0.6, '#8DF9FF'], [0.85, '#0077FF'], [1, '#0077FF']] }
  };
  const CANVAS_FONT = '"Inter", "Noto Sans JP", sans-serif';
  const WEEK = TIMER_TEXT.weekdaysShort;
  // Canvas はアイコンフォントのリガチャを使えないため、icons.css に埋め込まれた
  // SVG（--icon-<name> カスタムプロパティ）を読み込んで色を付け替えながら描画する。
  const ICON = {
    play: 'play',
    pause: 'pause',
    home: 'home'
  };
  const BATTERY_ICONS = [
    'battery_0',
    'battery_1',
    'battery_2',
    'battery_3',
    'battery_4',
    'battery_5'
  ];
  const BATTERY_ICON_FULL = BATTERY_ICONS[BATTERY_ICONS.length - 1];
  function iconUrl(name) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--icon-${name}`)
      .trim();
    const match = /^url\((?:'|")?(.*?)(?:'|")?\)$/.exec(value);
    return match ? match[1] : '';
  }
  const iconImages = new Map();
  for (const name of [ICON.play, ICON.pause, ICON.home, ...BATTERY_ICONS]) {
    const url = iconUrl(name);
    if (!url) continue;
    const img = new Image();
    img.src = url;
    if (img.decode) img.decode().catch(() => {});
    iconImages.set(name, img);
  }
  // アイコンは黒一色なので、オフスクリーンへ描いて色で塗り替えたものをキャッシュする。
  const iconTintCache = new Map();
  function tintedIcon(name, size, color) {
    const img = iconImages.get(name);
    if (!img || !img.complete || !img.naturalWidth) return null;
    const px = Math.max(1, Math.round(size * DPR));
    const key = `${name}|${px}|${color}`;
    let layer = iconTintCache.get(key);
    if (!layer) {
      layer = document.createElement('canvas');
      layer.width = px;
      layer.height = px;
      const g = layer.getContext('2d');
      g.drawImage(img, 0, 0, px, px);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, px, px);
      iconTintCache.set(key, layer);
    }
    return layer;
  }
  // (x, y) を中心に size 四方でアイコンを描画する。
  function drawIcon(ctx, name, x, y, size, color, alpha = 1) {
    const layer = tintedIcon(name, size, color);
    if (!layer) return;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    ctx.drawImage(layer, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = prevAlpha;
  }
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  // Canvas の 0 度は右向き。270 度にしてグラデーションの開始位置を真上へ。
  const CANVAS_GRADIENT_START_OFFSET = 270;
  /* ===== ユーティリティ ===== */
  const $ = id => document.getElementById(id);
  const pad2 = n => String(n).padStart(2, '0');
  // easeInOutCubic
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // 数値のイージング（go で目標を変えた瞬間の現在値から滑らかに遷移）
  class Tween {
    constructor(v) { this.a = v; this.b = v; this.t0 = 0; this.dur = 0; }
    value(now) {
      if (!this.dur) return this.b;
      const t = Math.min(1, Math.max(0, (now - this.t0) / this.dur));
      return this.a + (this.b - this.a) * ease(t);
    }
    go(target, now, dur) {
      this.a = this.value(now);
      this.b = target;
      this.t0 = now;
      this.dur = dur;
    }
  }
  // 文字・アイコンのクロスフェード（旧と新を同時にフェード。フェードアウト→インではない）
  class Crossfade {
    constructor() { this.prev = null; this.cur = null; this.t0 = 0; this.dur = 0; }
    set(v, now, dur) {
      if (v === this.cur) return;
      if (this.cur !== null) this.prev = this.cur;
      this.cur = v;
      this.t0 = now;
      this.dur = this.prev === null ? 0 : dur; // 初回は即時表示
    }
    draw(now, fn) {
      const t = this.dur ? Math.min(1, (now - this.t0) / this.dur) : 1;
      const e = ease(t);
      if (this.prev !== null && t < 1) fn(this.prev, 1 - e);
      fn(this.cur, e);
      if (t >= 1) this.prev = null;
    }
  }
  /* ===== 要素 ===== */
  const setupEl = $('setup');
  const stage = $('stage');
  const displayEl = $('display');
  const startBtn = $('startBtn');
  const optLight = $('optLight');
  const optInfo = $('optInfo');
  const optFull = $('optFull');
  const optCompletionNotice = $('optCompletionNotice');
  const requiredElements = { setupEl, stage, displayEl, startBtn, optLight, optInfo, optFull, optCompletionNotice };
  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);
  if (missingElements.length > 0) {
    console.error('[timer] Required HTML elements are missing:', missingElements);
    return;
  }
  const ctx = stage.getContext('2d');
  if (!ctx) {
    console.error('[timer] Canvas 2D context is unavailable.');
    return;
  }
  /* ===== 状態 ===== */
  let digits = '000000'; // HHMMSS
  const state = {
    phase: 'setup',   // 'setup' | 'playing' | 'complete'
    theme: 'dark',
    running: false,
    accum: 0,         // 一時停止までの経過ms
    segStart: 0,      // 直近の再開時刻
    total: 0,         // 総時間ms
    looping: false,
    fadeEnd: 0,       // 設定へ戻るフェードの終了時刻
    battery: null,
    completionHandled: false,
    finishedWithoutNotice: false,
    audioUnlockAttempted: false,
    audioUnlocked: false,
    completionFadeStart: 0
  };
  let W = 0, H = 0, DPR = 1, U = 1;
  let glassKey = '', glassLayer = null, glassSize = 0, glassR = 0;
  let wakeLock = null;
  let contrastSamplingWarningLogged = false;
  let completionBgCanvas = null;
  let completionBgKey = '';
  let completionBgLayout = null;
  let completionPreviousFrame = null;
  const COMPLETION_FADE_DURATION = 520;
  const completionAudio = new Audio(new URL('./Sedna.ogg', document.baseURI).href);
  completionAudio.loop = true;
  completionAudio.preload = 'auto';
  completionAudio.addEventListener('error', () => {
  }, { once: true });
  completionAudio.load();
  let pauseT = new Tween(0);
  let labelFade = new Crossfade();
  let iconFade = new Crossfade();
  const batIconFade = new Crossfade();
  const batTween = new Tween(0);
  /* ===== テーマ（設定画面の背景・色はCSSのtransitionで切替） ===== */
  const cssWallpaper = th => {
    const { start, stops } = WALLPAPER[th];
    const list = stops.map(([t, c]) => `${c} ${(t * 100).toFixed(1)}%`).join(', ');
    return `conic-gradient(from ${start}deg at 50% 50%, ${list})`;
  };
  function applyTheme() {
    state.theme = optLight.checked ? 'light' : 'dark';
    document.body.classList.toggle('light', state.theme === 'light');
  }
  /* ===== 開始画面：入力 ===== */
  const parseDigits = s => (+s.slice(0, 2)) * 3600 + (+s.slice(2, 4)) * 60 + (+s.slice(4, 6));
  const fmtDigits = s => s.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
  function updateSetup() {
    displayEl.textContent = fmtDigits(digits);
    startBtn.disabled = parseDigits(digits) === 0;
  }
  const pushDigit = d => { digits = digits.slice(1) + d; updateSetup(); };
  const popDigit = () => { digits = '0' + digits.slice(0, 5); updateSetup(); };
  /* ===== 完了音声 ===== */
  function unlockCompletionAudio() {
    if (state.audioUnlockAttempted || state.audioUnlocked) return;
    state.audioUnlockAttempted = true;
    // 開始ボタンのユーザー操作中にミュート再生しておき、完了時の自動再生を許可されやすくする。
    completionAudio.muted = true;
    let playPromise;
    try {
      playPromise = completionAudio.play();
    } catch (error) {
      completionAudio.muted = false;
      state.audioUnlockAttempted = false;
      return;
    }
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => {
        // 音声準備中にすでに完了画面へ移動していたら、再生中の完了音を止めない。
        if (state.phase !== 'complete') {
          completionAudio.pause();
          try { completionAudio.currentTime = 0; } catch {}
        }
        completionAudio.muted = false;
        state.audioUnlocked = true;
      }).catch(error => {
        completionAudio.muted = false;
        state.audioUnlockAttempted = false;
        if (error?.name === 'AbortError') {
        }
      });
    } else {
      completionAudio.pause();
      completionAudio.muted = false;
      state.audioUnlocked = true;
    }
  }
  async function playCompletionAudio() {
    try {
      completionAudio.loop = true;
      completionAudio.muted = false;
      try { completionAudio.currentTime = 0; } catch {}
      const playPromise = completionAudio.play();
      if (playPromise && typeof playPromise.then === 'function') await playPromise;
    } catch (error) {
      if (error?.name === 'AbortError' && state.phase !== 'complete') {
        return;
      }
    }
  }
  function stopCompletionAudio() {
    completionAudio.pause();
    try { completionAudio.currentTime = 0; } catch {}
  }
  /* ===== フルスクリーン / スリープ抑止 ===== */
  function enterFullscreen() {
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn) return;
    try { const p = fn.call(el); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  function exitFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (!fsEl || !fn) return;
    try { const p = fn.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  async function acquireWake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  function releaseWake() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  /* ===== 画面遷移・再生制御 ===== */
  function startTimer() {
    const total = parseDigits(digits) * 1000;
    if (!total) return;
    const now = performance.now();
    stopCompletionAudio();
    state.total = total;
    state.accum = 0;
    state.segStart = now;
    state.running = true;
    state.phase = 'playing';
    state.completionHandled = false;
    state.finishedWithoutNotice = false;
    completionPreviousFrame = null;
    if (optCompletionNotice.checked) unlockCompletionAudio();
    pauseT = new Tween(0);
    labelFade = new Crossfade();
    iconFade = new Crossfade();
    setupEl.classList.add('off');   // 設定はフェードアウト
    stage.classList.add('on');       // 再生画面は同時にフェードイン
    if (optFull.checked) enterFullscreen();
    acquireWake();
    resize();
    ensureLoop();
  }
  function captureCompletionTransitionFrame() {
    if (!stage.width || !stage.height) {
      return null;
    }
    const frame = document.createElement('canvas');
    frame.width = stage.width;
    frame.height = stage.height;
    const frameCtx = frame.getContext('2d');
    if (!frameCtx) {
      console.error('[timer] Completion transition canvas context is unavailable.');
      return null;
    }
    frameCtx.drawImage(stage, 0, 0);
    return frame;
  }
  function finishTimer(now = performance.now()) {
    // 完了時の通知が有効な場合だけ、タイマーを完了状態へ遷移させる。
    if (!optCompletionNotice.checked || state.completionHandled || state.phase !== 'playing') return;
    state.accum = state.total;
    state.running = false;
    state.completionHandled = true;
    completionPreviousFrame = captureCompletionTransitionFrame();
    state.completionFadeStart = now;
    state.phase = 'complete';
    state.finishedWithoutNotice = false;
    pauseT = new Tween(0);
    void playCompletionAudio();
    ensureLoop();
  }
  function continueAfterCompletion() {
    if (state.phase !== 'complete') return;
    stopCompletionAudio();
    const now = performance.now();
    state.phase = 'playing';
    state.finishedWithoutNotice = false;
    state.running = true;
    state.accum = state.total;
    state.segStart = now;
    pauseT.go(0, now, 450);
    ensureLoop();
  }
  function backToSetup() {
    const now = performance.now();
    stopCompletionAudio();
    state.running = false;
    state.phase = 'setup';
    state.finishedWithoutNotice = false;
    completionPreviousFrame = null;
    state.fadeEnd = now + 700;
    setupEl.classList.remove('off');
    stage.classList.remove('on');
    exitFullscreen();
    releaseWake();
    ensureLoop();
  }
  function togglePlay() {
    const now = performance.now();
    if (state.running) {
      state.accum += now - state.segStart;
      state.running = false;
      pauseT.go(1, now, 450);
    } else {
      state.segStart = now;
      state.running = true;
      pauseT.go(0, now, 450);
    }
  }
  /* ===== サイズ・レイヤー ===== */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    stage.width = Math.round(W * DPR);
    stage.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.min(W / 716, H / 414); // 画像（716×414）基準の倍率
    glassKey = '';
    completionBgKey = '';
    completionBgCanvas = null;
    completionBgLayout = null;
  }
  // 描画済み背景の輝度を使い、背景とコントラストが高い黒／白を選ぶ。
  // x / y は CSS ピクセル座標。Canvas の実ピクセル座標へ DPR を反映する。
  function contrastColorAt(x, y) {
    try {
      const pixelX = Math.max(0, Math.min(stage.width - 1, Math.floor(x * DPR)));
      const pixelY = Math.max(0, Math.min(stage.height - 1, Math.floor(y * DPR)));
      const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
      const linearize = value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      };
      const luminance = 0.2126 * linearize(pixel[0])
        + 0.7152 * linearize(pixel[1])
        + 0.0722 * linearize(pixel[2]);
      // 少し明るい青（例: #0077FF）でも、見た目に合わせて白を選びやすくする。
      return luminance > 0.25 ? '#000000' : '#ffffff';
    } catch (error) {
      if (!contrastSamplingWarningLogged) {
        contrastSamplingWarningLogged = true;
      }
      return state.theme === 'dark' ? '#ffffff' : '#000000';
    }
  }
  function batteryIconForLevel(level) {
    const safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 1;
    if (safeLevel >= 1) return BATTERY_ICON_FULL;
    const index = Math.min(BATTERY_ICONS.length - 1, Math.floor(safeLevel * BATTERY_ICONS.length));
    return BATTERY_ICONS[index] || BATTERY_ICONS[0];
  }
  // オフスクリーン描画用レイヤー（デバイスピクセル解像度）
  function makeLayer(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * DPR);
    c.height = Math.ceil(h * DPR);
    const g = c.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw(g);
    return c;
  }
  // CSS の inset box-shadow を再現（円を clip し、ずらした穴の外側だけを塗る）
  function insetShadow(g, x, y, r, dx, dy, blur, color) {
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.clip();
    g.beginPath();
    g.rect(x - r * 2, y - r * 2, r * 4, r * 4);
    g.moveTo(x + dx + r, y + dy);
    g.arc(x + dx, y + dy, r, 0, TAU, true);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.shadowOffsetX = 0;
    g.shadowOffsetY = 0;
    g.fill('evenodd');
    g.restore();
  }
  // ガラスボタン（box-shadow の再現）
  function drawGlass(g, x, y, r, dark) {
    g.save();
    g.shadowColor = dark ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.06)';
    g.shadowBlur = 27 * U;
    g.shadowOffsetY = 4 * U;
    g.fillStyle = dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.restore();
    insetShadow(g, x, y, r,  1 * U, 0, 0.5 * U, 'rgba(0,0,0,0.45)');
    insetShadow(g, x, y, r, -1 * U, 0, 0.5 * U, 'rgba(0,0,0,0.45)');
    insetShadow(g, x, y, r, 0,  1 * U, 0.5 * U, 'rgba(255,255,255,0.45)');
    insetShadow(g, x, y, r, 0, -1 * U, 0.5 * U, 'rgba(255,255,255,0.45)');
  }
  function buildGlass() {
    const key = `${U}|${DPR}|${state.theme}`;
    if (key === glassKey) return;
    glassKey = key;
    glassR = 16 * U;
    glassSize = 2 * (glassR + 44 * U);
    const dark = state.theme === 'dark';
    glassLayer = makeLayer(glassSize, glassSize, g => drawGlass(g, glassSize / 2, glassSize / 2, glassR, dark));
  }
  function drawGlassAt(x, y, alpha) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(glassLayer, x - glassSize / 2, y - glassSize / 2, glassSize, glassSize);
  }
  /* ===== 完了画面（Canvas描画） ===== */
  function buildCompletionBackground() {
    const blur = Math.max(18, 42 * U);
    const margin = Math.ceil(blur * 2.1);
    const logicalW = W + margin * 2;
    const logicalH = H + margin * 2;
    const key = `${W}|${H}|${DPR}|${U}|${state.theme}|${blur}`;
    if (completionBgCanvas && key === completionBgKey && completionBgLayout) return completionBgLayout;
    const background = document.createElement('canvas');
    background.width = Math.max(1, Math.ceil(logicalW * DPR));
    background.height = Math.max(1, Math.ceil(logicalH * DPR));
    const backgroundCtx = background.getContext('2d');
    if (!backgroundCtx) {
      console.error('[timer] Completion background canvas context is unavailable.');
      return null;
    }
    backgroundCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const { start, stops } = WALLPAPER[state.theme];
    if (backgroundCtx.createConicGradient) {
      const angle = (start + CANVAS_GRADIENT_START_OFFSET + 360) * PI / 180;
      const gradient = backgroundCtx.createConicGradient(angle, logicalW / 2, logicalH / 2);
      stops.forEach(([position, color]) => gradient.addColorStop(position, color));
      backgroundCtx.fillStyle = gradient;
    } else {
      backgroundCtx.fillStyle = stops[stops.length - 1][1];
    }
    backgroundCtx.fillRect(0, 0, logicalW, logicalH);
    // 開始画面と同じテーマ用オーバーレイで背景の明るさを揃える。
    backgroundCtx.fillStyle = state.theme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)';
    backgroundCtx.fillRect(0, 0, logicalW, logicalH);
    completionBgCanvas = background;
    completionBgKey = key;
    completionBgLayout = { canvas: background, blur, margin, logicalW, logicalH };
    return completionBgLayout;
  }
  function drawCompletionBackground() {
    const background = buildCompletionBackground();
    if (!background) {
      ctx.fillStyle = state.theme === 'dark' ? '#00152b' : '#e8faff';
      ctx.fillRect(0, 0, W, H);
      return;
    }
    ctx.save();
    ctx.filter = `blur(${background.blur}px)`;
    ctx.drawImage(background.canvas, -background.margin, -background.margin, background.logicalW, background.logicalH);
    ctx.restore();
  }
  function roundedRectPath(x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function getCompletionButtons() {
    const gap = 14 * U;
    const buttonH = 80 * U;
    const buttonW = Math.min(210 * U, Math.max(72 * U, (W - 36 * U - gap) / 2));
    const totalW = buttonW * 2 + gap;
    const y = H * 0.72 - buttonH / 2;
    const startX = (W - totalW) / 2;
    return {
      exit: { x: startX, y, width: buttonW, height: buttonH },
      continue: { x: startX + buttonW + gap, y, width: buttonW, height: buttonH }
    };
  }
  function drawCompletionButton(rect, label, primary) {
    const dark = state.theme === 'dark';
    const foreground = primary ? (dark ? '#000000' : '#ffffff') : contrastColorAt(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const radius = rect.height / 2;
    ctx.save();
    // 終了ボタンは再生画面のガラスボタンに合わせ、外側の柔らかい影を強める。
    ctx.shadowColor = primary ? 'rgba(0,0,0,0.12)' : (dark ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.08)');
    ctx.shadowBlur = (primary ? 16 : 27) * U;
    ctx.shadowOffsetY = (primary ? 3 : 4) * U;
    roundedRectPath(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fillStyle = primary ? (dark ? '#ffffff' : '#000000') : (dark ? 'rgba(0,16,34,0.38)' : 'rgba(255,255,255,0.34)');
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (!primary) {
      // ガラス面の上端ハイライトと下端の内側シャドウ。
      ctx.save();
      roundedRectPath(rect.x, rect.y, rect.width, rect.height, radius);
      ctx.clip();
      const gloss = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.height);
      gloss.addColorStop(0, dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.34)');
      gloss.addColorStop(0.22, 'rgba(255,255,255,0.025)');
      gloss.addColorStop(0.62, 'rgba(0,0,0,0)');
      gloss.addColorStop(1, dark ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.10)');
      ctx.fillStyle = gloss;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.restore();
      roundedRectPath(rect.x, rect.y, rect.width, rect.height, radius);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.32)';
      ctx.lineWidth = Math.max(0.7, U);
      ctx.stroke();
      // 内側に細い縁を重ねてガラスらしい反射を出す。
      const inset = Math.max(1, 1.2 * U);
      roundedRectPath(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2, Math.max(0, radius - inset));
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.28)';
      ctx.lineWidth = Math.max(0.5, 0.6 * U);
      ctx.stroke();
    }
    ctx.fillStyle = foreground;
    ctx.font = `500 ${28 * U}px ${CANVAS_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.restore();
  }
  function drawCompletionScreen() {
    drawCompletionBackground();
    const numberColor = contrastColorAt(W / 2, H * 0.31);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = numberColor;
    ctx.font = `300 ${Math.min(88 * U, W * 0.18)}px ${CANVAS_FONT}`;
    ctx.fillText('100%', W / 2, H * 0.31);
    const buttons = getCompletionButtons();
    drawCompletionButton(buttons.exit, TIMER_TEXT.exitLabel, false);
    drawCompletionButton(buttons.continue, TIMER_TEXT.continueLabel, true);
  }
  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
  /* ===== 描画 ===== */
  function draw(now) {
    if (state.phase === 'complete') {
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      const fadeProgress = Math.max(0, Math.min(1, (now - state.completionFadeStart) / COMPLETION_FADE_DURATION));
      if (completionPreviousFrame && fadeProgress < 1) {
        ctx.drawImage(completionPreviousFrame, 0, 0, W, H);
      }
      ctx.save();
      ctx.globalAlpha = ease(fadeProgress);
      drawCompletionScreen();
      ctx.restore();
      ctx.globalAlpha = 1;
      if (fadeProgress >= 1 && completionPreviousFrame) {
        completionPreviousFrame = null;
      }
      return;
    }
    buildGlass();
    const dark = state.theme === 'dark';
    const elapsed = state.accum + (state.running ? now - state.segStart : 0);
    const progress = state.total ? elapsed / state.total : 0;
    const pct = Math.floor(progress * 100);
    const pv = pauseT.value(now);
    const cy = H - 36 * U;
    const lx = 40 * U;
    const rx = W - 36 * U;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    // 壁紙：進捗（%）に合わせて1周回転
    const { start, stops } = WALLPAPER[state.theme];
    if (ctx.createConicGradient) {
      const gradientAngle = (start + CANVAS_GRADIENT_START_OFFSET + progress * 360) * PI / 180;
      const grd = ctx.createConicGradient(gradientAngle, W / 2, H / 2);
      stops.forEach(([t, c]) => grd.addColorStop(t, c));
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = stops[stops.length - 1][1];
    }
    ctx.fillRect(0, 0, W, H);
    // 一時停止時のオーバーレイ（ダーク＝黒、ライト＝白）
    if (pv > 0) {
      ctx.fillStyle = dark ? `rgba(0,0,0,${0.6 * pv})` : `rgba(255,255,255,${0.6 * pv})`;
      ctx.fillRect(0, 0, W, H);
    }
    // 上部：日付・時刻・バッテリー
    if (optInfo.checked) {
      const d = new Date();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `500 ${15 * U}px ${CANVAS_FONT}`;
      const dateText = timerFormat(TIMER_TEXT.dateTimeFormat, {
          hour: d.getHours(),
          minute: pad2(d.getMinutes()),
          month: d.getMonth() + 1,
          day: d.getDate(),
          weekday: WEEK[d.getDay()]
        });
      ctx.fillStyle = contrastColorAt(26 * U + ctx.measureText(dateText).width / 2, 30 * U);
      ctx.globalAlpha = 0.72;
      ctx.fillText(dateText, 26 * U, 30 * U);
      ctx.globalAlpha = 1;
      const bat = state.battery;
      const iconX = W - 26 * U;
      // Battery Status API が使える場合だけ実際の残量を描画する。
      // API 非対応環境で満充電と誤表示しないよう、取得できない場合はアイコンを出さない。
      if (bat) {
        const lv = Number.isFinite(bat.level) ? Math.max(0, Math.min(1, bat.level)) : 1;
        const batIcon = batteryIconForLevel(lv);
        batIconFade.set(batIcon, now, 350);
        ctx.textAlign = 'right';
        const batteryColor = contrastColorAt(iconX - 10 * U, 30 * U);
        batIconFade.draw(now, (g, a) => {
          drawIcon(ctx, g, iconX - 10 * U, 30 * U, 20 * U, batteryColor, a * 0.72);
        });
        // 残量％は30%以下のときだけ表示（フェードで出し入れ）
        const showBat = lv <= 0.3;
        const tgt = showBat ? 1 : 0;
        if (batTween.b !== tgt) batTween.go(tgt, now, 400);
        const bv = batTween.value(now);
        if (bv > 0) {
          const batteryPercentText = `${Math.round(lv * 100)}%`;
          const percentX = iconX - 24 * U;
          ctx.globalAlpha = bv * 0.72;
          ctx.font = `500 ${14 * U}px ${CANVAS_FONT}`;
          ctx.fillStyle = contrastColorAt(percentX - ctx.measureText(batteryPercentText).width / 2, 30 * U);
          ctx.fillText(batteryPercentText, percentX, 30 * U);
        }
      }
      ctx.globalAlpha = 1;
    }
    // 下部左：再生／一時停止ボタン（アイコンもクロスフェード）
    drawGlassAt(lx, cy, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const playbackIcon = state.finishedWithoutNotice ? ICON.pause : (state.running ? ICON.pause : ICON.play);
    iconFade.set(playbackIcon, now, 350);
    const playbackIconColor = contrastColorAt(lx, cy);
    iconFade.draw(now, (g, a) => {
      drawIcon(ctx, g, lx, cy, 20 * U, playbackIconColor, a);
    });
    // 進捗テキスト（値・状態が変わるとき同時クロスフェード）
    const label = state.finishedWithoutNotice
      ? timerFormat(TIMER_TEXT.percentFormat, { percent: pct })
      : (state.running
          ? timerFormat(pct < 100 ? TIMER_TEXT.percentCompleteFormat : TIMER_TEXT.percentFormat, { percent: pct })
          : timerFormat(TIMER_TEXT.tapToResumeFormat, { percent: pct }));
    labelFade.set(label, now, 350);
    ctx.textAlign = 'left';
    ctx.font = `600 ${18 * U}px ${CANVAS_FONT}`;
    const labelColor = contrastColorAt(lx + 39 * U + ctx.measureText(label).width / 2, cy);
    labelFade.draw(now, (txt, a) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = labelColor;
      ctx.fillText(txt, lx + 39 * U, cy);
    });
    // 右下：ホーム（一時停止中のみ、フェードで出現）
    if (pv > 0) {
      drawGlassAt(rx, cy, pv);
      ctx.textAlign = 'center';
      drawIcon(ctx, ICON.home, rx, cy, 20 * U, contrastColorAt(rx, cy), pv);
    }
    ctx.globalAlpha = 1;
  }
  function loop() {
    const now = performance.now();
    // 通知がオンの場合だけ100%到達を完了扱いにする。オフなら100%を超えても計測・再生を続ける。
    if (state.phase === 'playing' && state.running && !state.completionHandled) {
      const elapsed = state.accum + (now - state.segStart);
      if (optCompletionNotice.checked && elapsed >= state.total) finishTimer(now);
    }
    // 設定へ戻ったあと、フェードアウトが終わったら描画を止める。
    if (state.phase === 'setup' && now > state.fadeEnd) {
      state.looping = false;
      return;
    }
    draw(now);
    requestAnimationFrame(loop);
  }
  function ensureLoop() {
    if (!state.looping) {
      state.looping = true;
      requestAnimationFrame(loop);
    }
  }
  /* ===== 入力 ===== */
  document.querySelectorAll('.key').forEach(btn =>
    btn.addEventListener('click', () => pushDigit(btn.dataset.d))
  );
  startBtn.addEventListener('click', startTimer);
  optLight.addEventListener('change', applyTheme);
  optCompletionNotice.addEventListener('change', () => {
  });
  // 再生画面：タップで開始／一時停止。完了画面では終了／続けるを選択。
  stage.addEventListener('pointerdown', e => {
    if (state.phase === 'complete') {
      const buttons = getCompletionButtons();
      if (pointInRect(e.clientX, e.clientY, buttons.exit)) {
        backToSetup();
      } else if (pointInRect(e.clientX, e.clientY, buttons.continue)) {
        continueAfterCompletion();
      }
      return;
    }
    if (state.phase !== 'playing') return;
    if (!state.running) {
      const rx = W - 36 * U, cy = H - 36 * U;
      if (Math.hypot(e.clientX - rx, e.clientY - cy) <= 20 * U) {
        backToSetup();
        return;
      }
    }
    if (state.finishedWithoutNotice) {
      return;
    }
    togglePlay();
  });
  window.addEventListener('resize', () => { resize(); });
  // キーボード（PC用）
  document.addEventListener('keydown', e => {
    if (state.phase === 'setup') {
      if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
      else if (e.key === 'Backspace') popDigit();
      else if (e.key === 'Enter' && !startBtn.disabled) startTimer();
    } else if (state.phase === 'complete') {
      if (e.key === 'Escape') {
        e.preventDefault();
        backToSetup();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        continueAfterCompletion();
      }
    } else if (state.finishedWithoutNotice && e.key === 'Escape') {
      e.preventDefault();
      backToSetup();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (!state.finishedWithoutNotice) togglePlay();
    }
  });
  function applyTranslations() {
    document.documentElement.lang = TIMER_LANGUAGE;
    document.title = TIMER_TEXT.pageTitle;
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;
      const value = TIMER_TEXT[key];
      if (typeof value !== "string") return;
      if (key === "setupNote") {
        const lines = value.split("\n");
        element.replaceChildren();
        lines.forEach((line, index) => {
          if (index > 0) element.append(document.createElement("br"));
          element.append(document.createTextNode(line));
        });
        return;
      }
      element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(element => {
      const value = TIMER_TEXT[element.dataset.i18nAria];
      if (typeof value === "string") element.setAttribute("aria-label", value);
    });
  }
  /* ===== 初期化 ===== */
  document.documentElement.style.setProperty('--wp-dark', cssWallpaper('dark'));
  document.documentElement.style.setProperty('--wp-light', cssWallpaper('light'));
  applyTranslations();
  applyTheme();
  updateSetup();
  resize();
  if (navigator.getBattery) {
    navigator.getBattery()
      .then(b => {
        state.battery = b;
      })
      .catch(() => {});
  }
  if (document.fonts) {
    document.fonts.load('300 56px "Inter"').catch(() => {});
    document.fonts.load('600 18px "Inter"').catch(() => {});
    document.fonts.load('600 18px "Noto Sans JP"', TIMER_TEXT.fontSample).catch(() => {});
  }
})();