(function () {
  const adScriptUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874';
  const script = document.createElement('script');
  script.src = adScriptUrl;
  script.async = true;

  script.onerror = function () {
    // 広告スクリプトの読み込みに失敗 → 広告ブロッカーが有効とみなす
    window.location.href = 'https://search3958.github.io/entry.html';
  };

  script.onload = function () {
    // 読み込み成功時は何もしない（通常通り広告表示）
  };

  document.head.appendChild(script);
})();