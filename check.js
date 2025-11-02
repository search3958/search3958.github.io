document.addEventListener('DOMContentLoaded', async function () {
  if (localStorage.getItem('termsAccepted') === 'false') {
    console.log('利用規約未同意');
    window.location.href = 'https://search3958.github.io/entry.html';
    return;
  }

  const adScriptUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874';

  try {
    const response = await fetch(adScriptUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();

    if (text.length < 740) {//確認
      console.log('スクリプトは偽り');
      window.location.href = 'https://search3958.github.io/aderror.html';
      return;
    }

    console.log(`スクリプト取得成功・${text.length}文字`);
    const script = document.createElement('script');
    script.textContent = text;
    document.head.appendChild(script);

  } catch (error) {
    // CORS エラー、ネットワークエラー、404 などすべてここに来る
    console.log('アクセス不可能');
    window.location.href = 'https://search3958.github.io/aderror.html';
  }
});