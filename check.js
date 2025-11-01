document.addEventListener('DOMContentLoaded', function () {
  const adScriptUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874';
  const script = document.createElement('script');
  script.src = adScriptUrl;
  script.async = true;

  script.onerror = function () {
    // 広告スクリプトがブロックされた（読み込み失敗）
    window.location.href = 'https://search3958.github.io/entry.html';
  };

  script.onload = function () {
    // 成功時は何もしない
  };

  document.head.appendChild(script);
});