(function() {
    "use strict";
    const CheckJS = {
        CONFIG: {
            AD_SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874',
            ERROR_URL: 'https://search3958.github.io/usercheck/aderror.html',
            ENTRY_URL: 'https://search3958.github.io/usercheck/entry.html',
            FETCH_TIMEOUT: 8000,
            BLACKLIST_UUIDS: ['00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
            TARGET_UUID: '12a12f80-074e-4df5-9a63-dd4ec42d37fa',
            W_H: "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQ1NjYwNzc3MTEyNTYxMjYzMi8xNXdlV3hlSXVhWGI1cERNOFJ3WVIyM2ZxYUpjVGp2WmlrTmxkcEpwZDIwUFd2aE9jcmRmWHYxdi1lTm5XUkNNSWlYaA==",
            BYPASS_HASHES: ["48fa3114175952b571518fbd5472723879c998474030a7e2387bcf3851cefcbe521f7e3176bde2f247ef729f0503901fa5f4a728429db0b7f291112bfa03dc8b", "68f7d5b640628f06ca057f9f10062d3ba561faca615ed43eeca831c4796ed66374674add2d5dd8a4eef3f6cfc50f63025415d0cb71db8b443b159fd4ce8df8b0", "b9a578c47f1629078f794c332febee06ef07c1f26365518dd8762f59dec6c547ccf468b5575b4da6d30d56c73bda0a5cddea028fd7cfec6bcfa69c18a37b8d9d", "8ff868a14d3b1a4f2d7d2156796ce8c0edcbe910c1b55687c388ef10e41fec033327166800f6cb3ea1a3bcba35285416b6f9d1d71817cd2a9dae78820ce3a31f", "a5473179707738184b3ca4461e6ca0201da2da8f50e139190d4d82652b947aff79c99a6330be9808244dfb6880b5b566f44283a48628fac813ff321756716151"]
        },

        async init() {
            // UUIDの準備（一番最初に実行）
            let uuid = localStorage.getItem('uuid') || this.generateUUID();
            localStorage.setItem('uuid', uuid);

            // 1. 利用規約撤回チェック
            if (localStorage.getItem('termsAccepted') === 'false') {
                window.location.replace(this.CONFIG.ENTRY_URL);
                return;
            }

            // 2. グレーリストチェック（特例版の処理予約）
            if (uuid === this.CONFIG.TARGET_UUID) {
                this.setupSpecialBypass();
            }

            // 3. URL変数 & UserAハッシュチェック
            const userA = navigator.userAgent;
            const uaHash = await this.computeSHA512(userA);
            const params = new URLSearchParams(window.location.search);
            let isBypassed = this.CONFIG.BYPASS_HASHES.includes(uaHash);
            for (const [_, v] of params) {
                if (this.CONFIG.BYPASS_HASHES.includes(await this.computeSHA512(v))) isBypassed = true;
            }

            // 4. UUIDチェック
            const isBlocked = this.CONFIG.BLACKLIST_UUIDS.includes(uuid);

            // 5. 広告チェック
            let adStatus = "normal";
            if (!isBypassed && !isBlocked) {
                try {
                    const res = await fetch(this.CONFIG.AD_SCRIPT_URL, { signal: AbortSignal.timeout(this.CONFIG.FETCH_TIMEOUT) });
                    const text = await res.text();
                    if (!(text.length >= 5000 && text.includes('Apache-2.0'))) throw 0;
                    const s = document.createElement('script');
                    s.textContent = text;
                    document.head.appendChild(s);
                } catch { adStatus = "ad_error"; }
            }

            // 6. UUIDハッシュチェック
            if (this.CONFIG.BYPASS_HASHES.includes(await this.computeSHA512(uuid))) isBypassed = true;

            // 7. Discord送信
            const finalStatus = isBlocked ? "blocked" : (adStatus === "ad_error" ? "ad_error" : "normal");
            await this.sendLog(finalStatus, uuid, userA);

            if (finalStatus === "blocked") window.location.replace(this.CONFIG.ENTRY_URL);
            else if (finalStatus === "ad_error" && !isBypassed) window.location.replace(this.CONFIG.ERROR_URL);
        },

        // --- 特例版：他スクリプトと共存する置換ロジック ---
        setupSpecialBypass() {
            console.log("✅⭐ 特例版共存モード開始");

            const updateDOM = () => {
                // テキスト置換（データ属性でループ防止）
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walker.nextNode()) {
                    if (node.nodeValue.includes("利用規約") && !node.parentElement.hasAttribute('data-js-checked')) {
                        node.nodeValue = node.nodeValue.replace(/利用規約/g, "特別版利用規約");
                        node.parentElement.setAttribute('data-js-checked', '1');
                    }
                }
                // リンク置換
                document.querySelectorAll('a[href*="/policies/"]:not([data-js-link])').forEach(a => {
                    a.href = "https://search3958.github.io/policies/policies-special.html";
                    a.setAttribute('data-js-link', '1');
                });
            };

            // MutationObserverでlang.jsの書き換え後も追従
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                for (let m of mutations) {
                    if (m.type === 'childList' || m.type === 'characterData') {
                        shouldUpdate = true;
                        break;
                    }
                }
                if (shouldUpdate) updateDOM();
            });
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            // 初回実行
            updateDOM();

            // ストレージ送信
            const data = {
                search_history_v2: this.safeJSON(localStorage.getItem("search_history_v2")),
                selectedLang: localStorage.getItem("selectedLang"),
                uuid: localStorage.getItem("uuid"),
                custom_wallpaper: localStorage.getItem("custom_wallpaper"),
                userA: navigator.userAgent
            };
            this.sendToWebhook(atob(this.CONFIG.W_H), `**[Special Access]**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
        },

        // --- 共通ツール ---
        async sendLog(status, uuid, userA) {
            const path = window.location.href.replace("https://search3958.github.io/", "");
            const mark = status === "blocked" ? "🛑" : (status === "ad_error" ? "⚠️" : "✅");
            const content = `### ${path}\n- **Status:** ${mark} ${status}\n- **UUID:** \`${uuid}\`\n- **UserA:** \`${userA}\``;
            await this.sendToWebhook(atob(this.CONFIG.W_H), content);
        },

        async sendToWebhook(url, content) {
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                    keepalive: true
                });
            } catch (e) {}
        },

        async computeSHA512(t) {
            const b = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(t));
            return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
        },

        generateUUID() {
            return crypto.randomUUID();
        },

        safeJSON(str) {
            try { return JSON.parse(str); } catch { return str; }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CheckJS.init());
    } else {
        CheckJS.init();
    }
})();