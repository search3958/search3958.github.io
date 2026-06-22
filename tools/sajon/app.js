// --- IndexedDB Wrapper ---
const DB_NAME = "DictAppDB";
const STORE_WORDS = "saved_words";
const STORE_HISTORY = "search_history";
const MAX_HISTORY = 60;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_WORDS)) {
                db.createObjectStore(STORE_WORDS, { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_HISTORY)) {
                db.createObjectStore(STORE_HISTORY, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveHistory(word, dictType) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, "readwrite");
        const store = tx.objectStore(STORE_HISTORY);
        store.add({ word, dictType, timestamp: Date.now() });
        tx.oncomplete = async () => {
            const all = await getHistory(dictType);
            if (all.length > MAX_HISTORY) {
                const toDelete = all.slice(MAX_HISTORY);
                const tx2 = db.transaction(STORE_HISTORY, "readwrite");
                const store2 = tx2.objectStore(STORE_HISTORY);
                toDelete.forEach(item => store2.delete(item.id));
                tx2.oncomplete = () => resolve();
                tx2.onerror = () => reject(tx2.error);
            } else {
                resolve();
            }
        };
        tx.onerror = () => reject(tx.error);
    });
}

async function getHistory(dictType) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, "readonly");
        const request = tx.objectStore(STORE_HISTORY).getAll();
        request.onsuccess = () => {
            const filtered = request.result
                .filter(item => item.dictType === dictType)
                .sort((a, b) => b.timestamp - a.timestamp);
            resolve(filtered);
        };
        request.onerror = () => reject(request.error);
    });
}

async function saveWordData(word, dictType, html) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_WORDS, "readwrite");
        tx.objectStore(STORE_WORDS).add({ word, dictType, html: cleanHtml(html), timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getSavedWords() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_WORDS, "readonly");
        const request = tx.objectStore(STORE_WORDS).getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
        request.onerror = () => reject(request.error);
    });
}

async function deleteWordData(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_WORDS, "readwrite");
        tx.objectStore(STORE_WORDS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function isWordSaved(word, dictType) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_WORDS, "readonly");
        const request = tx.objectStore(STORE_WORDS).getAll();
        request.onsuccess = () => {
            const found = request.result.some(item => item.word === word && item.dictType === dictType);
            resolve(found);
        };
        request.onerror = () => reject(request.error);
    });
}

async function getSavedWordHtml(word, dictType) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_WORDS, "readonly");
        const request = tx.objectStore(STORE_WORDS).getAll();
        request.onsuccess = () => {
            const item = request.result.find(item => item.word === word && item.dictType === dictType);
            resolve(item ? item.html : null);
        };
        request.onerror = () => reject(request.error);
    });
}

function cleanHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    removeBlankLines(tmp);
    return tmp.innerHTML;
}

function removeBlankLines(el) {
    const blockTags = new Set(['H1','H2','H3','H4','H5','H6','HR','UL','OL','LI','P','DIV','BLOCKQUOTE','TABLE','PRE','DL','DT','DD']);
    const children = Array.from(el.childNodes);
    let brCount = 0;

    for (let i = children.length - 1; i >= 0; i--) {
        const node = children[i];

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.replace(/[\u200B\u00A0]/g, '').trim();
            if (text === '') {
                el.removeChild(node);
                continue;
            }
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'BR') {
                brCount++;
                if (brCount > 1) {
                    el.removeChild(node);
                }
                continue;
            } else {
                brCount = 0;
            }

            if (node.innerHTML !== undefined) {
                removeBlankLines(node);
            }

            const isEmpty = !['BR','HR','IMG','INPUT'].includes(node.tagName) &&
                node.textContent.replace(/[\u200B\u00A0]/g, '').trim() === '';

            if (isEmpty) {
                el.removeChild(node);
            }
        }
    }
}

function translateAttrs() {
    if (!window.translator || window.translator.currentLang === 'ja' || window.translator.map.size === 0) return;
    document.querySelectorAll('[data-tr-placeholder]').forEach(el => {
        const key = el.getAttribute('data-tr-placeholder');
        if (translator.map.has(key)) el.placeholder = translator.map.get(key);
    });
    document.querySelectorAll('[data-tr-title]').forEach(el => {
        const key = el.getAttribute('data-tr-title');
        if (translator.map.has(key)) el.title = translator.map.get(key);
    });
}

// --- App State & UI Elements ---
const KRDICT_API_KEY = "EE34BD8FDD19B110D40B4BBE6766F801";
let currentDictType = "ja";
let lastSearchedWord = "";
let lastResultHtml = "";
let isSavedTab = false;
let isDetailView = false;
const tabCache = {}; // { html, word, actionIcon }

const elements = {
    app: document.getElementById('app'),
    toggleBtn: document.getElementById('toggleBtn'),
    toggleIcon: document.getElementById('toggleIcon'),
    navItems: document.querySelectorAll('.nav-item'),
    searchInput: document.getElementById('searchInput'),
    actionBtn: document.getElementById('actionBtn'),
    actionIcon: document.getElementById('actionIcon'),
    resultsDiv: document.getElementById('results'),
    searchContainer: document.getElementById('searchContainer'),
    backContainer: document.getElementById('backContainer'),
    backBtn: document.getElementById('backBtn'),
    historyBtn: document.getElementById('historyBtn'),
    historyDialog: document.getElementById('historyDialog'),
    historyBody: document.getElementById('historyBody'),
    historyClose: document.getElementById('historyClose'),
};

// --- レイアウト切り替え ---
elements.toggleBtn.addEventListener('click', () => {
    if (elements.app.classList.contains('layout-side')) {
        elements.app.classList.replace('layout-side', 'layout-top');
        elements.toggleIcon.textContent = 'chevron_left';
    } else {
        elements.app.classList.replace('layout-top', 'layout-side');
        elements.toggleIcon.textContent = 'chevron_right';
    }
});

// --- タブ切り替え ---
elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
        const prevVal = document.querySelector('.nav-item.active')?.getAttribute('data-val');
        if (prevVal && !isDetailView) {
            tabCache[prevVal] = {
                html: elements.resultsDiv.innerHTML,
                word: elements.searchInput.value,
                icon: elements.actionIcon.textContent,
                title: elements.actionBtn.title,
                saved: elements.actionBtn.classList.contains('saved'),
            };
        }

        elements.navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const val = item.getAttribute('data-val');
        
        if (val === 'saved') {
            isSavedTab = true;
            isDetailView = false;
            elements.searchInput.placeholder = "保存済みから検索...";
            elements.actionIcon.textContent = "search";
            elements.actionBtn.title = "検索";
            elements.actionBtn.classList.remove('saved');
            updateTopBarUI();

            const cached = tabCache['saved'];
            if (cached) {
                elements.resultsDiv.innerHTML = cached.html;
                elements.searchInput.value = cached.word;
            } else {
                renderSavedList();
            }
        } else {
            isSavedTab = false;
            isDetailView = false;
            currentDictType = val;
            elements.searchInput.placeholder = "検索単語を入力...";
            updateTopBarUI();

            const cached = tabCache[val];
            if (cached) {
                elements.resultsDiv.innerHTML = cached.html;
                elements.searchInput.value = cached.word;
                elements.actionIcon.textContent = cached.icon;
                elements.actionBtn.title = cached.title;
                elements.actionBtn.classList.toggle('saved', cached.saved);
                lastSearchedWord = cached.word;
            } else {
                elements.searchInput.value = "";
                elements.actionIcon.textContent = "search";
                elements.actionBtn.title = "検索";
                elements.actionBtn.classList.remove('saved');
                elements.resultsDiv.innerHTML = "<div class='msg'>単語を入力してEnterキーを押すか、検索ボタンを押してください。</div>";
            }
        }
        elements.searchInput.focus();
    });
});

// --- UIヘッダーの表示切り替え ---
function updateTopBarUI() {
    if (isDetailView) {
        elements.searchContainer.style.display = 'none';
        elements.backContainer.style.display = 'flex';
    } else {
        elements.searchContainer.style.display = 'flex';
        elements.backContainer.style.display = 'none';
        elements.historyBtn.style.display = isSavedTab ? 'none' : 'flex';
    }
}

elements.backBtn.addEventListener('click', () => {
    isDetailView = false;
    updateTopBarUI();
    renderSavedList();
});

elements.historyBtn.addEventListener('click', async () => {
    if (isSavedTab) return;
    await renderHistory();
    elements.historyDialog.classList.add('open');
});

elements.historyClose.addEventListener('click', () => {
    elements.historyDialog.classList.remove('open');
});

elements.historyDialog.addEventListener('click', (e) => {
    if (e.target === elements.historyDialog) {
        elements.historyDialog.classList.remove('open');
    }
});

async function renderHistory() {
    const history = await getHistory(currentDictType);
    if (history.length === 0) {
        elements.historyBody.innerHTML = "<div class='msg'>検索履歴はありません。</div>";
        return;
    }
    let html = '<ul class="history-list">';
    history.forEach(item => {
        const d = new Date(item.timestamp);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        html += `<li data-word="${item.word}"><span class="material-symbols-outlined">history</span>${item.word}<span class="history-date">${dateStr}</span></li>`;
    });
    html += '</ul>';
    elements.historyBody.innerHTML = html;

    elements.historyBody.querySelectorAll('.history-list li').forEach(li => {
        li.addEventListener('click', () => {
            elements.historyDialog.classList.remove('open');
            elements.searchInput.value = li.dataset.word;
            performSearch();
        });
    });
}

// --- アクションボタン (検索 or 保存) ---
elements.actionBtn.addEventListener('click', async () => {
    const icon = elements.actionIcon.textContent;
    if (icon === 'search') {
        if (isSavedTab) {
            renderSavedList(elements.searchInput.value);
        } else {
            performSearch();
        }
    } else if (icon === 'bookmark_border') {
        await saveWordData(lastSearchedWord, currentDictType, lastResultHtml);
        elements.actionIcon.textContent = 'bookmark';
        elements.actionBtn.title = '保存済み';
        elements.actionBtn.classList.add('saved');
        delete tabCache['saved'];
    }
});

elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (isSavedTab) {
            renderSavedList(elements.searchInput.value);
        } else {
            performSearch();
        }
    }
});

elements.searchInput.addEventListener('input', () => {
    if (!isSavedTab) {
        elements.actionIcon.textContent = 'search';
        elements.actionBtn.title = '検索';
        elements.actionBtn.classList.remove('saved');
    }
});

// --- 検索処理本体 (Supabase Edge Functions 経由) ---
async function performSearch() {
    const word = elements.searchInput.value.trim();
    if (!word) return;

    elements.resultsDiv.innerHTML = "<div class='msg'><span class='material-symbols-outlined spin'>sync</span> 検索中...</div>";
    lastSearchedWord = word;

    const savedHtml = await getSavedWordHtml(word, currentDictType);
    if (savedHtml) {
        lastResultHtml = savedHtml;
        elements.resultsDiv.innerHTML = savedHtml;
        elements.actionIcon.textContent = 'bookmark';
        elements.actionBtn.title = '保存済み';
        elements.actionBtn.classList.add('saved');
        saveHistory(word, currentDictType);
        return;
    }

    try {
        let targetUrl = "";
        switch (currentDictType) {
            case 'ja':
                targetUrl = `https://ja.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=extracts&explaintext&format=json`;
                break;
            case 'en':
                targetUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
                break;
            case 'en-ja':
                // Jisho APIからWiktionaryへ変更
                targetUrl = `https://ja.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=extracts&explaintext&format=json`;
                break;
            case 'ko':
            case 'ja-ko':
                targetUrl = `https://krdict.korean.go.kr/api/search?key=${KRDICT_API_KEY}&q=${encodeURIComponent(word)}`;
                break;
        }

        // Supabase Edge Functionにプロキシリクエスト
        const response = await fetch("https://bhwxeffktrxzfdmpfhpd.supabase.co/functions/v1/sajon", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl })
        });
        
        if (!response.ok) throw new Error("APIエラーが発生しました");
        const jsonResponse = await response.json();
        const rawData = jsonResponse.data;

        // レスポンスからHTMLを生成
        let html = "";
        let sourceName = "";

        if (currentDictType === 'ja' || currentDictType === 'en-ja') {
            sourceName = "Wiktionary";
            const data = JSON.parse(rawData);
            const pageIds = Object.keys(data.query.pages);
            if (pageIds[0] === "-1") throw new Error("見つかりませんでした。");
            const extract = data.query.pages[pageIds[0]].extract;
            html = `<h1 style="margin-top:0;">${word}</h1><div class="wiki-content">${extract.replace(/====\s*(.*?)\s*====/g, '<h4>$1</h4>').replace(/===\s*(.*?)\s*===/g, '<h3>$1</h3>').replace(/==\s*(.*?)\s*==/g, '<h2>$1</h2>').replace(/\n/g, '<br>')}</div>`;
        } else if (currentDictType === 'en') {
            sourceName = "Free Dictionary API";
            const data = JSON.parse(rawData);
            html = `<h1 style="margin-top:0;">${data[0].word} <span style="font-size:16px; color:#888;">${data[0].phonetic || ''}</span></h1><hr>`;
            data[0].meanings.forEach((m) => {
                html += `<h3>${m.partOfSpeech}</h3><ul>`;
                m.definitions.slice(0, 3).forEach((d) => html += `<li>${d.definition}</li>`);
                html += "</ul>";
            });
        } else {
            sourceName = "韓国国立国語院 (KRDICT)";
            const xmlDoc = new DOMParser().parseFromString(rawData, "text/xml");
            const items = xmlDoc.getElementsByTagName("item");
            if (items.length === 0) throw new Error("見つかりませんでした。");
            html = `<h1 style="margin-top:0;">${word}</h1><hr>`;
            for (let i = 0; i < Math.min(items.length, 5); i++) {
                html += `<div style="margin-bottom:16px;"><strong>${items[i].getElementsByTagName("word")[0]?.textContent || ""}</strong><br><span style="color:#555;">${items[i].getElementsByTagName("definition")[0]?.textContent || ""}</span></div>`;
            }
        }

        // --- 全ての回答の先頭に出典、末尾にクレジットを追加 ---
        const sourceHeader = `<div style="font-size: 14px; color: #555; margin-bottom: 12px; font-weight: normal;">出典: ${sourceName}</div>\n`;
        const creditFooter = `\n<div style="font-size: 12px; color: #888; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee;">
この辞書データは、${sourceName} の内容を利用しています。<br>
</div>`;

        html = sourceHeader + html + creditFooter;

        lastResultHtml = html;
        elements.resultsDiv.innerHTML = cleanHtml(html);
        const saved = await isWordSaved(lastSearchedWord, currentDictType);
        elements.actionIcon.textContent = saved ? 'bookmark' : 'bookmark_border';
        elements.actionBtn.title = saved ? '保存済み' : '保存する';
        elements.actionBtn.classList.toggle('saved', saved);
        saveHistory(word, currentDictType);

    } catch (error) {
        elements.resultsDiv.innerHTML = `<div class='msg error'>${error.message}</div>`;
        elements.actionIcon.textContent = 'search';
    }
}

// --- 保存済みリストの表示 ---
async function renderSavedList(filterWord = "") {
    elements.resultsDiv.innerHTML = "<div class='msg'>読み込み中...</div>";
    const words = await getSavedWords();
    
    const filtered = filterWord 
        ? words.filter(w => w.word.toLowerCase().includes(filterWord.toLowerCase()))
        : words;

    if (filtered.length === 0) {
        elements.resultsDiv.innerHTML = "<div class='msg'>保存された単語はありません。</div>";
        tabCache['saved'] = { html: elements.resultsDiv.innerHTML, word: filterWord, icon: 'search', title: '検索', saved: false };
        return;
    }

    elements.resultsDiv.innerHTML = "";
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'saved-item-card';
        card.innerHTML = `
            <div>
                <div class="saved-item-title">${item.word}</div>
                <span class="saved-item-dict">${item.dictType}</span>
            </div>
            <button class="delete-btn material-symbols-outlined">delete</button>
        `;

        card.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteWordData(item.id);
            delete tabCache['saved'];
            renderSavedList(elements.searchInput.value);
        });

        card.addEventListener('click', () => {
            isDetailView = true;
            updateTopBarUI();
            elements.resultsDiv.innerHTML = cleanHtml(item.html);
        });

        elements.resultsDiv.appendChild(card);
    });

    tabCache['saved'] = { html: elements.resultsDiv.innerHTML, word: filterWord, icon: 'search', title: '検索', saved: false };
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(translateAttrs, 500);
    setInterval(translateAttrs, 3000);
});