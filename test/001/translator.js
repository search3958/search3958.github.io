// translator.js
class XmlTranslator {
    constructor() {
        // 1. 保存された設定 2. ブラウザの言語 3. デフォルト'ja' の優先順位
        this.currentLang = localStorage.getItem('selectedLang') || this.getBrowserLang();
        this.map = new Map();
    }

    // ブラウザの言語設定を取得し、対応している形式に整形する
    getBrowserLang() {
        const navLang = navigator.language; // 例: "en-US", "ja", "zh-CN"
        
        // 当サイトが対応している言語コードのリスト
        const supported = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'ko-KP'];
        
        // 完全一致があればそれを返す
        if (supported.includes(navLang)) return navLang;
        
        // 前方一致（"en-US" -> "en" など）をチェック
        const shortLang = navLang.split('-')[0];
        const match = supported.find(s => s.startsWith(shortLang));
        
        return match || 'ja'; // 見つからなければ日本語
    }

    async init() {
        const scriptTag = document.currentScript;
        const xmlPath = scriptTag.getAttribute('data-xml');
        if (xmlPath) await this.load(xmlPath);
    }

    // フォールバック（代替）言語を決定するロジック
    getFallbackLang(lang) {
        const rules = {
            'zh-CN': 'zh-TW',
            'zh-TW': 'zh-CN',
            'ko-KP': 'ko',
            'ko': 'ko-KP'
        };
        return rules[lang] || null;
    }

    async load(xmlPath) {
        try {
            const response = await fetch(xmlPath);
            const text = await response.text();
            const xml = new DOMParser().parseFromString(text, "application/xml");
            
            // 日本語マスターの作成
            const jaTexts = {};
            xml.querySelectorAll('lang[id="ja"] text').forEach(node => {
                jaTexts[node.getAttribute('key')] = node.textContent.trim();
            });

            // 翻訳データの取得（フォールバック対応）
            let targetLang = this.currentLang;
            let targetNodes = xml.querySelectorAll(`lang[id="${targetLang}"] text`);

            // 指定言語がXMLにない、または空の場合はフォールバックを試す
            if (targetNodes.length === 0) {
                const fallback = this.getFallbackLang(targetLang);
                if (fallback) {
                    const fallbackNodes = xml.querySelectorAll(`lang[id="${fallback}"] text`);
                    if (fallbackNodes.length > 0) {
                        targetNodes = fallbackNodes;
                    }
                }
            }

            // マップの構築
            targetNodes.forEach(node => {
                const key = node.getAttribute('key');
                const translatedText = node.textContent.trim();
                if (jaTexts[key]) {
                    this.map.set(jaTexts[key], translatedText);
                }
            });
            
            this.translatePage();
        } catch (e) {
            console.error("XML Load Error:", e);
        }
    }

    translatePage() {
        // 日本語選択時は置換不要
        if (this.currentLang === 'ja' || this.map.size === 0) {
            document.documentElement.lang = 'ja';
            return;
        }

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const originalText = node.textContent.trim();
            if (this.map.has(originalText)) {
                node.textContent = this.map.get(originalText);
            }
        }
        document.documentElement.lang = this.currentLang;
    }

    setLanguage(lang) {
        localStorage.setItem('selectedLang', lang);
        location.reload();
    }
}

// 自動実行
const translator = new XmlTranslator();
window.addEventListener('DOMContentLoaded', () => {
    translator.init();
    const selector = document.getElementById('lang-switch');
    if (selector) {
        selector.value = translator.currentLang;
        selector.addEventListener('change', (e) => translator.setLanguage(e.target.value));
    }
});