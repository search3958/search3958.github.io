const canvas = document.getElementById("lensFx_canvas");
const ctx = canvas.getContext("2d");

const LAYER_COUNT = 15;
const MIN_ZOOM = 0.1, MAX_ZOOM = 1.1;
const SHRINK_STEP = 4;

function safeInverseEasing(t) {
  const ε = 0.05;
  const v = 1 / (t + ε) - 1 / ε;
  const maxV = 1 / (1 + ε) - 1 / ε;
  return v / maxV;
}

function radiusEasing(t) {
  return 0.3 + 0.7 * (1 - t * t);
}

function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

function getRadius() {
  return parseFloat(getComputedStyle(canvas).borderRadius) || 150;
}

let snapshotImage = null;

function drawLens(img) {
  if (!img) return;

  updateCanvasSize();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = canvas.getBoundingClientRect();
  const wLens = rect.width;
  const hLens = rect.height;
  const radius = getRadius();
  const cx = vw / 2;
  const cy = vh / 2;

  const scaleX = img.width / vw;
  const scaleY = img.height / vh;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < LAYER_COUNT; i++) {
    const t = i / (LAYER_COUNT - 1);
    const zoom = MIN_ZOOM + safeInverseEasing(t) * (MAX_ZOOM - MIN_ZOOM);
    const w = wLens - i * SHRINK_STEP;
    const h = hLens - i * SHRINK_STEP;
    const dx = (wLens - w) / 2;
    const dy = (hLens - h) / 2;
    const imgCenterX = cx * scaleX;
    const imgCenterY = cy * scaleY;
    const sw = (w / zoom) * scaleX;
    const sh = (h / zoom) * scaleY;
    const sx = imgCenterX - sw / 2;
    const sy = imgCenterY - sh / 2;
    const easedRadius = radius * radiusEasing(t);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx + easedRadius, dy);
    ctx.lineTo(dx + w - easedRadius, dy);
    ctx.quadraticCurveTo(dx + w, dy, dx + w, dy + easedRadius);
    ctx.lineTo(dx + w, dy + h - easedRadius);
    ctx.quadraticCurveTo(dx + w, dy + h, dx + w - easedRadius, dy + h);
    ctx.lineTo(dx + easedRadius, dy + h);
    ctx.quadraticCurveTo(dx, dy + h, dx, dy + h - easedRadius);
    ctx.lineTo(dx, dy + easedRadius);
    ctx.quadraticCurveTo(dx, dy, dx + easedRadius, dy);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, w, h);
    ctx.restore();
  }
}

function captureDOM() {
  html2canvas(document.body, { backgroundColor: null }).then(canvas => {
    snapshotImage = new Image();
    snapshotImage.src = canvas.toDataURL("image/png");
    snapshotImage.onload = () => drawLens(snapshotImage);
  });
}

// 初回描画
captureDOM();

// 動的に再描画（任意の頻度で調整）
window.addEventListener("resize", captureDOM);
window.addEventListener("scroll", captureDOM);

const mo = new MutationObserver(captureDOM);
mo.observe(document.body, { childList: true, subtree: true, attributes: true });
