class XmlTranslator {
    constructor() {
        console.log("XmlTranslator: Initializing...");
        
        // 1. スクリプトタグの取得（詳細ログ付き）
        const scriptTag = document.currentScript;
        if (scriptTag) {
            this.xmlPath = scriptTag.getAttribute('data-xml');
            console.log("XmlTranslator: Found script tag, xmlPath =", this.xmlPath);
        } else {
            console.warn("XmlTranslator: document.currentScript is null. Trying fallback...");
            // フォールバック: data-xml属性を持つ唯一のスクリプトタグを探す
            const fallbackTag = document.querySelector('script[data-xml]');
            this.xmlPath = fallbackTag ? fallbackTag.getAttribute('data-xml') : null;
            console.log("XmlTranslator: Fallback xmlPath =", this.xmlPath);
        }
        
        this.currentLang = localStorage.getItem('selectedLang') || this.getBrowserLang();
        console.log("XmlTranslator: Selected Language =", this.currentLang);
        
        this.map = new Map();
        this.observer = null;
    }

    getBrowserLang() {
        const navLang = navigator.language;
        const supported = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko', 'ko-KP'];
        if (supported.includes(navLang)) return navLang;
        const shortLang = navLang.split('-')[0];
        const match = supported.find(s => s.startsWith(shortLang));
        return match || 'ja';
    }

    async init() {
        if (this.xmlPath) {
            console.log("XmlTranslator: Starting load...");
            await this.load(this.xmlPath);
            this.startObserving();
        } else {
            console.error("XmlTranslator: Cannot start. data-xml attribute is missing in HTML.");
        }
    }

    getFallbackLang(lang) {
        const rules = { 'zh-CN': 'zh-TW', 'zh-TW': 'zh-CN', 'ko-KP': 'ko', 'ko': 'ko-KP' };
        return rules[lang] || null;
    }

    async load(xmlPath) {
        try {
            console.log(`XmlTranslator: Fetching XML from ${xmlPath}...`);
            const response = await fetch(xmlPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const text = await response.text();
            console.log("XmlTranslator: XML loaded, parsing...");
            const xml = new DOMParser().parseFromString(text, "application/xml");
            
            // パースエラーチェック
            const parserError = xml.getElementsByTagName("parsererror");
            if (parserError.length > 0) {
                throw new Error("XML Parse Error: " + parserError[0].textContent);
            }

            const jaTexts = {};
            xml.querySelectorAll('lang[id="ja"] text').forEach(node => {
                jaTexts[node.getAttribute('key')] = node.textContent.trim();
            });
            console.log(`XmlTranslator: Found ${Object.keys(jaTexts).length} Japanese base texts.`);

            let targetLang = this.currentLang;
            let targetNodes = xml.querySelectorAll(`lang[id="${targetLang}"] text`);

            if (targetNodes.length === 0) {
                console.log(`XmlTranslator: No direct match for ${targetLang}, checking fallback...`);
                const fallback = this.getFallbackLang(targetLang);
                if (fallback) {
                    targetNodes = xml.querySelectorAll(`lang[id="${fallback}"] text`);
                    if (targetNodes.length > 0) console.log(`XmlTranslator: Using fallback lang: ${fallback}`);
                }
            }

            targetNodes.forEach(node => {
                const key = node.getAttribute('key');
                const translatedText = node.textContent.trim();
                if (jaTexts[key]) {
                    this.map.set(jaTexts[key], translatedText);
                }
            });

            console.log(`XmlTranslator: Dictionary created with ${this.map.size} entries.`);
            this.translatePage(document.body);

        } catch (e) {
            console.error("XmlTranslator: LOAD ERROR ->", e);
        }
    }

    translatePage(rootNode = document.body) {
        if (this.currentLang === 'ja' || this.map.size === 0) {
            document.documentElement.lang = 'ja';
            return;
        }

        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
        let node;
        let count = 0;
        while (node = walker.nextNode()) {
            if (this.replaceTextNode(node)) count++;
        }
        console.log(`XmlTranslator: Translation applied to ${count} nodes.`);
        document.documentElement.lang = this.currentLang;
    }

    replaceTextNode(node) {
        const originalText = node.textContent.trim();
        if (this.map.has(originalText)) {
            const translated = this.map.get(originalText);
            if (node.textContent !== translated) {
                node.textContent = translated;
                return true;
            }
        }
        return false;
    }

    startObserving() {
        if (this.currentLang === 'ja') return;
        console.log("XmlTranslator: MutationObserver started.");

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        this.replaceTextNode(node);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
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

    setLanguage(lang) {
        console.log(`XmlTranslator: Switching language to ${lang}...`);
        localStorage.setItem('selectedLang', lang);
        location.reload();
    }
}

const translator = new XmlTranslator();
window.addEventListener('DOMContentLoaded', () => {
    translator.init();
    const selector = document.getElementById('lang-switch');
    if (selector) {
        selector.value = translator.currentLang;
        selector.addEventListener('change', (e) => translator.setLanguage(e.target.value));
    } else {
        console.warn("XmlTranslator: #lang-switch element not found in HTML.");
    }
});