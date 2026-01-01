class XmlTranslator {
    constructor() {
        console.log("%cXmlTranslator: [Step 1] Initializing Constructor...", "color: #108cdf; font-weight: bold;");
        
        // スクリプトタグの取得
        const scriptTag = document.currentScript;
        if (scriptTag) {
            this.xmlPath = scriptTag.getAttribute('data-xml');
            console.log("XmlTranslator: Found via document.currentScript. path =", this.xmlPath);
        } else {
            const fallbackTag = document.querySelector('script[data-xml]');
            this.xmlPath = fallbackTag ? fallbackTag.getAttribute('data-xml') : null;
            console.log("XmlTranslator: Found via fallback selector. path =", this.xmlPath);
        }
        
        // 言語設定の取得
        this.currentLang = localStorage.getItem('selectedLang') || this.getBrowserLang();
        console.log(`XmlTranslator: %cCurrent Language Setting: [${this.currentLang}]`, "background: #222; color: #bada55; padding: 2px 4px;");
        
        this.map = new Map();
        this.observer = null;
        this.checkInterval = null;
    }

    getBrowserLang() {
        const navLang = navigator.language;
        const supported = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'ko-KP'];
        if (supported.includes(navLang)) return navLang;
        const shortLang = navLang.split('-')[0];
        const match = supported.find(s => s.startsWith(shortLang));
        return match || 'ja';
    }

    getFallbackLang(lang) {
        const rules = { 'zh-CN': 'zh-TW', 'zh-TW': 'zh-CN', 'ko-KP': 'ko', 'ko': 'ko-KP' };
        return rules[lang] || null;
    }

    async init() {
        console.log("XmlTranslator: [Step 2] Starting initialization...");
        if (this.xmlPath) {
            await this.load(this.xmlPath);
            this.startObserving();
            this.startPeriodicCheck(3000); 
        } else {
            console.error("%cXmlTranslator: CRITICAL ERROR - data-xml attribute is missing in HTML script tag.", "color: red; font-size: 14px;");
        }
    }

    async load(xmlPath) {
        try {
            console.log(`XmlTranslator: [Step 3] Fetching XML file from: ${xmlPath}`);
            const response = await fetch(xmlPath);
            if (!response.ok) throw new Error(`HTTP status: ${response.status}`);
            
            const text = await response.text();
            console.log("XmlTranslator: XML file received. Parsing...");
            const xml = new DOMParser().parseFromString(text, "application/xml");
            
            const parserError = xml.getElementsByTagName("parsererror");
            if (parserError.length > 0) {
                throw new Error("XML Parse Error: " + parserError[0].textContent);
            }

            // 日本語ベースの構築
            const jaTexts = {};
            const jaNodes = xml.querySelectorAll('lang[id="ja"] text');
            jaNodes.forEach(node => {
                jaTexts[node.getAttribute('key')] = node.textContent.trim();
            });
            console.log(`XmlTranslator: Found ${Object.keys(jaTexts).length} Japanese base entries in XML.`);

            // ターゲット言語の抽出
            let targetLang = this.currentLang;
            let targetNodes = xml.querySelectorAll(`lang[id="${targetLang}"] text`);

            if (targetNodes.length === 0) {
                console.warn(`XmlTranslator: No translations found for [${targetLang}]. Checking fallback...`);
                const fallback = this.getFallbackLang(targetLang);
                if (fallback) {
                    targetLang = fallback;
                    targetNodes = xml.querySelectorAll(`lang[id="${targetLang}"] text`);
                    console.log(`XmlTranslator: Switching to fallback lang [${targetLang}]. Found ${targetNodes.length} nodes.`);
                }
            }

            // 辞書マップの作成
            console.group("%cXmlTranslator: Dictionary Construction Details", "color: #f39c12;");
            targetNodes.forEach(node => {
                const key = node.getAttribute('key');
                const translatedText = node.textContent.trim();
                const originalJa = jaTexts[key];
                
                if (originalJa) {
                    this.map.set(originalJa, translatedText);
                    console.log(`Key[${key}]: "${originalJa}" ===> "${translatedText}"`);
                } else {
                    console.warn(`Key[${key}]: No matching Japanese text found for this key.`);
                }
            });
            console.groupEnd();

            console.log(`XmlTranslator: %cFinal Dictionary Size: ${this.map.size}`, "font-weight: bold; color: #2ecc71;");
            
            // 初回実行
            console.log("XmlTranslator: [Step 4] Running initial page translation...");
            this.translatePage(document.body);

        } catch (e) {
            console.error("%cXmlTranslator: LOAD ERROR", "background: red; color: white;", e);
        }
    }

    translatePage(rootNode = document.body) {
        if (this.currentLang === 'ja' || this.map.size === 0) return;

        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
        let node;
        let foundCount = 0;
        while (node = walker.nextNode()) {
            if (this.replaceTextNode(node)) foundCount++;
        }
        if (foundCount > 0) {
            console.log(`XmlTranslator: Processed ${foundCount} nodes in this pass.`);
        }
    }

    replaceTextNode(node) {
        const rawText = node.nodeValue;
        const trimmedText = rawText.trim();

        // 意味のあるテキストのみ対象にする
        if (!trimmedText || trimmedText.length === 0) return false;

        if (this.map.has(trimmedText)) {
            const translated = this.map.get(trimmedText);
            if (node.nodeValue !== translated) {
                console.log(`%c[MATCH] Replacing: "${trimmedText}" -> "${translated}"`, "color: #2ecc71; font-weight: bold;");
                node.nodeValue = translated;
                return true;
            }
            return false;
        } else {
            // マッチしなかったテキストを1度だけログに出す（デバッグ用）
            if (!node._trLogged) {
                console.log(`%c[SKIP] No dictionary entry for: "${trimmedText}"`, "color: #95a5a6; font-size: 9px;");
                node._trLogged = true; // ログの重複防止
            }
            return false;
        }
    }

    startObserving() {
        if (this.currentLang === 'ja') return;
        console.log("XmlTranslator: [Step 5] MutationObserver started.");

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 3) {
                        this.replaceTextNode(node);
                    } else if (node.nodeType === 1) {
                        this.translatePage(node);
                    }
                });
                if (mutation.type === 'characterData') {
                    this.replaceTextNode(mutation.target);
                }
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    startPeriodicCheck(ms = 3000) {
        if (this.currentLang === 'ja') return;
        console.log(`XmlTranslator: [Step 6] Periodic Check enabled (every ${ms}ms).`);
        this.checkInterval = setInterval(() => {
            this.translatePage(document.body);
        }, ms);
    }

    setLanguage(lang) {
        console.log(`XmlTranslator: Language Manual Change -> ${lang}`);
        localStorage.setItem('selectedLang', lang);
        location.reload();
    }
}
// クラス定義の最後、インスタンス化の部分
const translator = new XmlTranslator();

// 確実に init を動かすための実行ロジック
function startTranslator() {
    translator.init();
    
    // セレクターが存在する場合のバインド
    const selector = document.getElementById('lang-switch');
    if (selector) {
        selector.value = translator.currentLang;
        selector.addEventListener('change', (e) => translator.setLanguage(e.target.value));
    }
}

// すでに DOM が読み込み済みなら即実行、そうでなければイベントを待つ
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startTranslator);
} else {
    console.log("XmlTranslator: DOM already loaded, running init immediately.");
    startTranslator();
}