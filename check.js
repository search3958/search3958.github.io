document.addEventListener('DOMContentLoaded', function () {
  // 1. 利用規約未同意チェック
  if (localStorage.getItem('termsAccepted') === 'false') {
    window.location.href = 'https://search3958.github.io/entry.html';
    return; // 以降の処理を中断
  }

  // 2. 広告スクリプト読み込み試行
  const adScriptUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874';
  const script = document.createElement('script');
  script.src = adScriptUrl;
  script.async = true;

  script.onerror = function () {
    // 広告読み込み失敗 → aderror.html へ
    window.location.href = 'https://search3958.github.io/aderror.html';
  };

  // onload は特に何もしない（成功時は継続）
  document.head.appendChild(script);
});