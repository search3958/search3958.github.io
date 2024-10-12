// sidebar.js

// セクションとリンクのデータを配列として定義
const sections = [
    {
        title: '基本', // 小さい見出し
        links: [
            { text: 'Newtab3について', href: 'content1-1.html' }, // 外部ファイルのパス（HTML形式）
            { text: '使い方', href: 'content1-2.html' },
            { text: '今後の予定', href: 'content1-2.html' },
        ]
    },
    {
        title: 'バージョン', // 小さい見出し
        links: [
            { text: '細かな修正', href: 'content2-1.html' },
            { text: 'リンクの変更', href: 'content2-2.html' },
            { text: '機能の変更', href: 'content2-2.html' },
            { text: '見た目の変更', href: 'content2-2.html' },
        ]
    }
];

// サイドバーの要素を取得
const sidebar = document.getElementById('sidebar');
const contentFrame = document.getElementById('contentFrame');

// リンクをサイドバーに追加する関数
function addLinksToSidebar() {
    sections.forEach(section => {
        // セクション見出しを作成
        const sectionHeader = document.createElement('h3');
        sectionHeader.textContent = section.title;
        sidebar.appendChild(sectionHeader);

        // リンクを追加
        section.links.forEach(link => {
            const a = document.createElement('a');
            a.href = link.href;
            a.textContent = link.text;
            a.onclick = (event) => {
                event.preventDefault(); // デフォルトのリンク動作を防ぐ
                updateFrame(link.href); // iframeのsrcを更新
                updateURL(link.href); // URLを更新
            };
            sidebar.appendChild(a);
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
        const foundLink = sections.flatMap(section => section.links).find(link => link.href === section);
        if (foundLink) {
            updateFrame(foundLink.href); // iframeのsrcを更新
        }
    }
}

// ページが読み込まれたときにコンテンツを更新
updateContentFromURL();

// リンクを追加する関数を呼び出す
addLinksToSidebar();
