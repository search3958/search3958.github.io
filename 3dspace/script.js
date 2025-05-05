const angles = [0, 60, 120, 180, 240, 300];  // 360度を6等分
const carousel = document.getElementById('carousel');
const scene = document.getElementById('scene');

// ローカルストレージから距離を取得、なければデフォルト値を使用
let distance = parseInt(localStorage.getItem('carouselDistance')) || 400;
const baseDistance = 400;

// スライダーの初期値を設定
const distanceRange = document.getElementById('distanceRange');
const distanceValue = document.getElementById('distanceValue');
distanceRange.value = distance;
distanceValue.textContent = `${distance}px`;

let rotX = 0, rotY = 0;
let isDragging = false;
let startX = 0, startY = 0;
let velocityX = 0, velocityY = 0;
let lastX = 0, lastY = 0;
let animationId = null;

// アイテム位置更新
function updateItems() {
  const scaleFactor = Math.pow(distance / baseDistance, 1.7); // べき乗を使用してスケール変化を強調
  scene.style.transform = `scale(${scaleFactor})`;
  
  // 通常のアイテム
  const items = carousel.querySelectorAll('.carousel__item');
  items.forEach((item, idx) => {
    const ang = angles[idx];
    const itemId = item.getAttribute('data-id');
    const posOffset = currentWindowPositions[itemId] || { offsetX: 0, offsetY: 0 };
    
    item.style.transform = `rotateY(${ang}deg) translateZ(${distance}px) rotateY(180deg) translateX(${posOffset.offsetX}px) translateY(${posOffset.offsetY}px)`;
  });
  
  // 設定ウィンドウの配置（Item 3の上に）、y軸回転を追加
  const settingsWindow = carousel.querySelector('.settings-window');
  if (settingsWindow) {
    const ang = angles[2]; // Item 3 と同じ角度
    const tiltY = 0; // Y軸の追加回転角度
    const settingsId = settingsWindow.getAttribute('data-id');
    const posOffset = currentWindowPositions[settingsId] || { offsetX: 0, offsetY: -210 };
    
    // 初期Y位置を-210にしたい場合
    if (!currentWindowPositions[settingsId]) {
      currentWindowPositions[settingsId] = { offsetX: 0, offsetY: -210 };
    }
    
    settingsWindow.style.transform = `rotateY(${ang}deg) translateZ(${distance + 50}px) rotateY(${180 + tiltY}deg) translateX(${posOffset.offsetX}px) translateY(${posOffset.offsetY}px)`;
  }
}

// スムーズな回転を実装
function animate() {
  // 慣性による回転の継続
  if (!isDragging && (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1)) {
    rotY += velocityX;
    rotX += velocityY;
    rotX = Math.max(-60, Math.min(60, rotX));
    
    // より滑らかな減衰
    velocityX *= 0.95;
    velocityY *= 0.95;
    
    carousel.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }
  
  animationId = requestAnimationFrame(animate);
}

// コントロール
distanceRange.addEventListener('input', e => {
  distance = parseInt(e.target.value);
  distanceValue.textContent = `${distance}px`;
  // ローカルストレージに保存
  localStorage.setItem('carouselDistance', distance);
  updateItems();
});

// ドラッグ処理
let activeWindowDrag = null;
let windowDragOffsetX = 0;
let windowDragOffsetY = 0;
let currentWindowPositions = {};
let minimizedWindows = {};

function onDragStart(x, y, e) {
  // ウィンドウのヘッダー部分をドラッグしている場合
  if (e && (e.target.classList.contains('item-header') || e.target.classList.contains('settings-header') || 
            e.target.classList.contains('item-title') || e.target.parentElement.classList.contains('item-header') || 
            e.target.parentElement.classList.contains('settings-header'))) {
    // 最小化/サイズ切り替えボタンをクリックした場合は処理しない
    if (e.target.classList.contains('control-button')) return;
    
    // どのウィンドウのヘッダーをドラッグしているか特定
    const closestItem = e.target.closest('.carousel__item, .settings-window');
    if (closestItem) {
      e.stopPropagation();
      activeWindowDrag = closestItem.getAttribute('data-id');
      
      // 現在位置がなければ初期化
      if (!currentWindowPositions[activeWindowDrag]) {
        currentWindowPositions[activeWindowDrag] = { offsetX: 0, offsetY: 0 };
      }
      
      windowDragOffsetX = x;
      windowDragOffsetY = y;
      return;
    }
  }
  
  // 通常のカルーセル回転
  isDragging = true;
  startX = x;
  startY = y;
  lastX = x;
  lastY = y;
  velocityX = 0;
  velocityY = 0;
}

function onDragEnd() {
  isDragging = false;
  activeWindowDrag = null;
}

function onDragMove(x, y, e) {
  // ウィンドウ移動
  if (activeWindowDrag) {
    const dx = x - windowDragOffsetX;
    const dy = y - windowDragOffsetY;
    
    windowDragOffsetX = x;
    windowDragOffsetY = y;
    
    // 位置を更新
    currentWindowPositions[activeWindowDrag].offsetX += dx;
    currentWindowPositions[activeWindowDrag].offsetY += dy;
    
    // 更新された位置を反映
    updateItems();
    return;
  }
  
  // 通常のカルーセル回転
  if (!isDragging) return;
  
  const dx = x - startX;
  const dy = y - startY;
  startX = x;
  startY = y;
  
  // 速度計算
  velocityX = (x - lastX) * 0.2;
  velocityY = -(y - lastY) * 0.2;
  
  lastX = x;
  lastY = y;
  
  rotY += dx * 0.5;
  rotX -= dy * 0.5;
  rotX = Math.max(-60, Math.min(60, rotX));
  
  carousel.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

// マウス/タッチイベント
document.addEventListener('mousedown', e => {
  // ウィンドウのヘッダー部分のドラッグ処理
  if (e.target.classList.contains('item-header') || e.target.classList.contains('settings-header') || 
      e.target.classList.contains('item-title') || e.target.parentElement.classList.contains('item-header') || 
      e.target.parentElement.classList.contains('settings-header')) {
    if (!e.target.classList.contains('control-button')) {
      const closestItem = e.target.closest('.carousel__item, .settings-window');
      if (closestItem) {
        activeWindowDrag = closestItem.getAttribute('data-id');
        if (!currentWindowPositions[activeWindowDrag]) {
          currentWindowPositions[activeWindowDrag] = { offsetX: 0, offsetY: 0 };
        }
        windowDragOffsetX = e.clientX;
        windowDragOffsetY = e.clientY;
        return;
      }
    }
  }
  
  // フォーム要素上での操作は回転させない
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
      e.target.closest('form') || e.target.classList.contains('control-button')) {
    return;
  }
  
  e.preventDefault();
  onDragStart(e.clientX, e.clientY, e);
});

document.addEventListener('mouseup', onDragEnd);

document.addEventListener('mousemove', e => {
  onDragMove(e.clientX, e.clientY, e);
});

document.addEventListener('touchstart', e => {
  e.preventDefault();
  onDragStart(e.touches[0].clientX, e.touches[0].clientY, e);
});

document.addEventListener('touchend', onDragEnd);

document.addEventListener('touchmove', e => {
  e.preventDefault();
  onDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
});

// スクロール処理を document に移動
document.addEventListener('wheel', e => {
  // フォーム要素上でのスクロールは無視
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || 
      e.target.closest('form') || e.target.classList.contains('control-button')) {
    return;
  }

  e.preventDefault();
  
  // スクロール量を回転速度に変換
  const scrollMultiplier = 0.5;
  if (e.shiftKey) {
    velocityY += e.deltaY * 0.01 * scrollMultiplier;
  } else {
    velocityX += e.deltaX * 0.01 * scrollMultiplier;
    velocityY += e.deltaY * 0.01 * scrollMultiplier;
  }
  
  velocityX = Math.min(Math.max(velocityX, -2), 2);
  velocityY = Math.min(Math.max(velocityY, -2), 2);
});

// 最小化/復元処理
document.querySelectorAll('.minimize-button').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const itemId = e.target.getAttribute('data-id');
    
    if (itemId === 'settings') {
      const settingsWindow = carousel.querySelector('.settings-window');
      if (settingsWindow.classList.contains('minimized')) {
        // 復元
        settingsWindow.classList.remove('minimized');
        e.target.textContent = '－';
        minimizedWindows[itemId] = false;
      } else {
        // 最小化
        settingsWindow.classList.add('minimized');
        e.target.textContent = '＋';
        minimizedWindows[itemId] = true;
      }
    } else {
      const item = carousel.querySelector(`.carousel__item[data-id="${itemId}"]`);
      const contentElement = item.querySelector('.item-content');
      
      if (contentElement.style.display === 'none') {
        // 復元
        contentElement.style.display = 'flex';
        item.style.height = item.classList.contains('large') ? '380px' : '260px';
        e.target.textContent = '－';
        minimizedWindows[itemId] = false;
      } else {
        // 最小化
        contentElement.style.display = 'none';
        item.style.height = '36px';
        e.target.textContent = '＋';
        minimizedWindows[itemId] = true;
      }
    }
  });
});

// サイズ切り替え
document.querySelectorAll('.size-toggle').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const itemId = e.target.getAttribute('data-id');
    const item = carousel.querySelector(`.carousel__item[data-id="${itemId}"]`);
    
    if (item) {
      const isLarge = item.classList.toggle('large');
      
      // 最小化されていない場合のみ高さを調整
      if (!minimizedWindows[itemId]) {
        item.style.height = isLarge ? '380px' : '240px';
      }
      
      // アイコン変更
      e.target.textContent = isLarge ? '◇' : '⋄';
    }
    
    updateItems();
  });
});

// ウィンドウリサイズ対応
window.addEventListener('resize', updateItems);

// 検索フォームのクリックイベントハンドラを追加
document.querySelector('.searchinput').addEventListener('click', (e) => {
  e.stopPropagation(); // イベントの伝播を停止
  e.target.focus(); // 入力フィールドにフォーカス
});

document.querySelector('.carousel__item.search form').addEventListener('click', (e) => {
  e.stopPropagation(); // フォーム全体のクリックでもイベントの伝播を停止
});

// ドキュメント全体のクリックでフォーカスを外す
document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('searchinput')) {
    document.querySelector('.searchinput').blur();
  }
  if (e.target.id !== 'textbox1') {
    document.getElementById('textbox1').blur();
  }
});

// テキストエリアとフォームのイベントハンドラを追加
document.getElementById('textbox1').addEventListener('click', (e) => {
  e.stopPropagation(); // イベントの伝播を停止
  e.target.focus(); // テキストエリアにフォーカス
});

document.querySelector('.carousel__item[data-id="2"]').addEventListener('click', (e) => {
  // テキストエリアの親要素のクリックでもイベントの伝播を停止
  if (e.target.closest('.item-content')) {
    e.stopPropagation();
  }
});

// 初期配置と慣性アニメーション開始
updateItems();
animate();


const calcDisplay = document.getElementById('calc-display');

    function calcAppendValue(value) {
      if (calcDisplay.textContent === '0') {
        calcDisplay.textContent = value;
      } else {
        calcDisplay.textContent += value;
      }
    }

    function calcClearDisplay() {
      calcDisplay.textContent = '0';
    }

    function calcCalculate() {
      try {
        calcDisplay.textContent = eval(calcDisplay.textContent.replace(/÷/g, '/').replace(/×/g, '*'));
      } catch {
        calcDisplay.textContent = 'エラー';
      }
    }
    const textbox = document.getElementById('textbox1');

    // ページ読み込み時に保存された値を復元
    window.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem('textbox1');
      if (saved !== null) {
        textbox.value = saved;
      }
    });

    // 入力が変更されるたびに保存
    textbox.addEventListener('input', () => {
      localStorage.setItem('textbox1', textbox.value);
    });

    function aiGoToURL(target) {
      const query = document.getElementById('ai-query').value;
      if (!query) return;

      let url = '';
      if (target === 'chatgpt') {
        url = 'https://chatgpt.com/?q=' + encodeURIComponent(query);
      } else if (target === 'aisearch') {
        url = 'https://search3958.github.io/aisearch/?q=' + encodeURIComponent(query);
      }

      window.location.href = url;
    }

    function updateTime() {
      const displayTime = document.getElementById('timeDisplay');
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      const degree = (seconds / 60) * 360;
      displayTime.style.background = `conic-gradient(from ${degree}deg, rgba(138, 138, 138, 0.06) 0deg,rgba(133, 133, 133, 0.29) 360deg)`;
      displayTime.textContent = `${hours}:${minutes}`;
      requestAnimationFrame(updateTime)
    }
    updateTime();

    // ストップウォッチの変数
let stopwatchInterval;
let startTime;
let elapsedTime = 0;
let isRunning = false;

function startStopwatch() {
  if (!isRunning) {
    isRunning = true;
    startTime = Date.now() - elapsedTime;
    stopwatchInterval = setInterval(updateStopwatch, 10);
    document.getElementById('startBtn').textContent = '一時停止';
  } else {
    stopStopwatch();
  }
}

function stopStopwatch() {
  if (isRunning) {
    clearInterval(stopwatchInterval);
    elapsedTime = Date.now() - startTime;
    isRunning = false;
    document.getElementById('startBtn').textContent = '開始';
  }
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  elapsedTime = 0;
  isRunning = false;
  document.getElementById('stopwatch').textContent = '00:00.000';
  document.getElementById('startBtn').textContent = '開始';
}

function updateStopwatch() {
  const currentTime = Date.now();
  elapsedTime = currentTime - startTime;
  
  const minutes = Math.floor(elapsedTime / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);
  const milliseconds = elapsedTime % 1000;
  
  document.getElementById('stopwatch').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}