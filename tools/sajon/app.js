// --- IndexedDB Wrapper ---
const DB_NAME = "DictAppDB";
const STORE_NAME = "saved_words";

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveWordData(word, dictType, html) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).add({ word, dictType, html, timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getSavedWords() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
        request.onerror = () => reject(request.error);
    });
}

async function deleteWordData(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function isWordSaved(word, dictType) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
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
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => {
            const item = request.result.find(item => item.word === word && item.dictType === dictType);
            resolve(item ? item.html : null);
        };
        request.onerror = () => reject(request.error);
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
    }
}

elements.backBtn.addEventListener('click', () => {
    isDetailView = false;
    updateTopBarUI();
    renderSavedList();
});

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
                targetUrl = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`;
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
        if (currentDictType === 'ja') {
            const data = JSON.parse(rawData);
            const pageIds = Object.keys(data.query.pages);
            if (pageIds[0] === "-1") throw new Error("見つかりませんでした。");
            const extract = data.query.pages[pageIds[0]].extract;
            html = `<h1 style="margin-top:0;">${word}</h1><div class="wiki-content">${extract.replace(/====\s*(.*?)\s*====/g, '<h4>$1</h4>').replace(/===\s*(.*?)\s*===/g, '<h3>$1</h3>').replace(/==\s*(.*?)\s*==/g, '<h2>$1</h2>').replace(/\n/g, '<br>')}</div>`;
        } else if (currentDictType === 'en') {
            const data = JSON.parse(rawData);
            html = `<h1 style="margin-top:0;">${data[0].word} <span style="font-size:16px; color:#888;">${data[0].phonetic || ''}</span></h1><hr>`;
            data[0].meanings.forEach((m) => {
                html += `<h3>${m.partOfSpeech}</h3><ul>`;
                m.definitions.slice(0, 3).forEach((d) => html += `<li>${d.definition}</li>`);
                html += "</ul>";
            });
        } else if (currentDictType === 'en-ja') {
            const data = JSON.parse(rawData);
            if (!data.data || data.data.length === 0) throw new Error("見つかりませんでした。");
            html = `<h1 style="margin-top:0;">${word}</h1><hr>`;
            data.data.slice(0, 3).forEach((item) => {
                const jp = item.japanese[0].word || item.japanese[0].reading;
                const reading = item.japanese[0].reading && item.japanese[0].word ? `<span style="color:#888; font-size:14px;">(${item.japanese[0].reading})</span>` : "";
                html += `<div style="margin-bottom:16px;"><strong>${jp} ${reading}</strong><br><span style="color:#555;">${item.senses[0].english_definitions.join(", ")}</span></div>`;
            });
        } else {
            const xmlDoc = new DOMParser().parseFromString(rawData, "text/xml");
            const items = xmlDoc.getElementsByTagName("item");
            if (items.length === 0) throw new Error("見つかりませんでした。");
            html = `<h1 style="margin-top:0;">${word}</h1><hr>`;
            for (let i = 0; i < Math.min(items.length, 5); i++) {
                html += `<div style="margin-bottom:16px;"><strong>${items[i].getElementsByTagName("word")[0]?.textContent || ""}</strong><br><span style="color:#555;">${items[i].getElementsByTagName("definition")[0]?.textContent || ""}</span></div>`;
            }
        }

        lastResultHtml = html;
        elements.resultsDiv.innerHTML = html;
        const saved = await isWordSaved(lastSearchedWord, currentDictType);
        elements.actionIcon.textContent = saved ? 'bookmark' : 'bookmark_border';
        elements.actionBtn.title = saved ? '保存済み' : '保存する';
        elements.actionBtn.classList.toggle('saved', saved);

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
            elements.resultsDiv.innerHTML = item.html;
        });

        elements.resultsDiv.appendChild(card);
    });

    tabCache['saved'] = { html: elements.resultsDiv.innerHTML, word: filterWord, icon: 'search', title: '検索', saved: false };
}