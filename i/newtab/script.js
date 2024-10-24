// サイドバーの要素を取得
const sidebar = document.getElementById('sidebar');
const contentFrame = document.getElementById('contentFrame');

// リンクをクリックしたときにiframeの内容を更新
function addLinkListeners() {
    const links = document.querySelectorAll('.sidebar-link');
    
    links.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // デフォルトのリンク動作を防ぐ
            const href = link.getAttribute('href');
            updateFrame(href); // iframeのsrcを更新
            updateURL(href); // URLを更新
        });
    });
}

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
        const link = document.querySelector(`a[href="${section}"]`);
        if (link) {
            updateFrame(section); // iframeのsrcを更新
        }
    }
}

// ページが読み込まれたときにコンテンツを更新
updateContentFromURL();

// リンクにイベントリスナーを追加
addLinkListeners();
