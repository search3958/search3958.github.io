const contentFrame = document.getElementById('contentFrame');

// サイドバー内のリンクをすべて取得
const links = document.querySelectorAll('#sidebar a');

// リンクにクリックイベントを追加
links.forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault(); // デフォルトのリンク動作を防ぐ
        const href = this.getAttribute('href'); // クリックしたリンクのhrefを取得
        const section = new URLSearchParams(href.split('?')[1]).get('section'); // section パラメータを取得
        
        // sectionが取得できた場合、iframeのsrcを更新
        if (section) {
            const contentUrl = `https://search3958.github.io/i/newtab/content${section}`; // ここでURLを作成
            updateFrame(contentUrl); // iframeのsrcを更新
            updateURL(href); // URLを更新
        }
    });
});

// iframeのsrcを更新する関数
function updateFrame(src) {
    contentFrame.src = src; // 指定されたURLをiframeのsrcに設定
}

// URLのクエリパラメータを更新する関数
function updateURL(newUrl) {
    window.history.pushState({}, '', newUrl);
}

// 初回のコンテンツ更新（URLのクエリパラメータから）
function updateContentFromURL() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');

    if (section) {
        const contentUrl = `https://search3958.github.io/i/newtab/content${section}`; // URLを作成
        updateFrame(contentUrl); // iframeのsrcを更新
    }
}

// ページが読み込まれたときにコンテンツを更新
updateContentFromURL();

// URLの戻る/進む操作に対応
window.addEventListener('popstate', function() {
    updateContentFromURL();
});
