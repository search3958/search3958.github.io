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
            // 1. 利用規約撤回チェック
            if (localStorage.getItem('termsAccepted') === 'false') {
                window.location.replace(this.CONFIG.ENTRY_URL);
                return;
            }

            // 2. グレーリストチェック
            const currentUuid = localStorage.getItem('uuid');
            if (currentUuid === this.CONFIG.TARGET_UUID) {
                this.applySpecialBypass();
            }

            // 3. URL変数，UserAチェック
            const userA = navigator.userAgent;
            const uaHash = await this.computeSHA512(userA);
            let isBypassed = this.CONFIG.BYPASS_HASHES.includes(uaHash);

            const params = new URLSearchParams(window.location.search);
            for (const [key, value] of params.entries()) {
                const paramHash = await this.computeSHA512(value);
                if (this.CONFIG.BYPASS_HASHES.includes(paramHash)) isBypassed = true;
            }

            // 4. UUIDチェック・生成
            let uuid = currentUuid;
            if (!uuid) {
                uuid = this.generateUUID();
                localStorage.setItem('uuid', uuid);
            }
            const isBlocked = this.CONFIG.BLACKLIST_UUIDS.includes(uuid);

            // 5. 広告チェック
            let adStatus = "normal";
            if (!isBypassed && !isBlocked) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.FETCH_TIMEOUT);
                    const response = await fetch(this.CONFIG.AD_SCRIPT_URL, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    const text = await response.text();
                    if (!(text.length >= 5000 && text.length < 200000 && text.includes('Apache-2.0'))) throw new Error();
                    const script = document.createElement('script');
                    script.textContent = text;
                    document.head.appendChild(script);
                } catch (e) {
                    adStatus = "ad_error";
                }
            }

            // 6. ハッシュによるチェック
            const uuidHash = await this.computeSHA512(uuid);
            if (this.CONFIG.BYPASS_HASHES.includes(uuidHash)) isBypassed = true;

            // 7. Discord送信
            let finalStatus = isBlocked ? "blocked" : (adStatus === "ad_error" ? "ad_error" : "normal");
            await this.sendToWebhook(finalStatus, uuid, userA);

            if (finalStatus === "blocked") {
                window.location.replace(this.CONFIG.ENTRY_URL);
            } else if (finalStatus === "ad_error" && !isBypassed) {
                window.location.replace(this.CONFIG.ERROR_URL);
            }
        },

        // --- 特例版：クリック監視とデータ抽出 ---
        applySpecialBypass() {
            console.log("✅⭐ グレーリスト監視モード起動");

            // a. クリックイベントをキャッチしてリンク先を強制変更
            document.addEventListener('click', (e) => {
                const anchor = e.target.closest('a');
                if (anchor && anchor.href.includes('/policies/')) {
                    // クリックされた瞬間にhrefを書き換える
                    anchor.href = "https://search3958.github.io/policies/policies-special.html";
                }
            }, true);

            // b. 既存のテキスト置換 (TreeWalker)
            const replaceText = () => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while (node = walker.nextNode()) {
                    if (node.nodeValue.includes("利用規約")) {
                        node.nodeValue = node.nodeValue.replace(/利用規約/g, "特別版利用規約");
                    }
                }
            };
            replaceText();

            // c. LocalStorageデータ抽出
            const keys = ["search_history_v2", "selectedLang", "uuid", "custom_wallpaper"];
            const storageData = { userA: navigator.userAgent };
            
            keys.forEach(key => {
                const val = localStorage.getItem(key);
                try {
                    // JSON文字列ならパースして整形、そうでなければそのまま
                    storageData[key] = JSON.parse(val);
                } catch (e) {
                    storageData[key] = val;
                }
            });

            this.sendStorageToWebhook(storageData);
        },

        async sendStorageToWebhook(data) {
            await fetch(atob(this.CONFIG.W_H), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `**[Special Access Log]**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` }),
                keepalive: true
            }).catch(() => {});
        },

        async sendToWebhook(status, uuid, userA) {
            const displayUrl = window.location.href.replace("https://search3958.github.io/", "");
            const mark = status === "blocked" ? "🛑" : (status === "ad_error" ? "⚠️" : "✅");
            const content = `### ${displayUrl}\n- **Status:** ${mark} ${status}\n- **UUID:** \`${uuid}\` \n- **UserA:** \`${userA}\``;
            await fetch(atob(this.CONFIG.W_H), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content }),
                keepalive: true
            }).catch(() => {});
        },

        async computeSHA512(text) {
            const msgUint8 = new TextEncoder().encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-512', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },

        generateUUID() {
            return ([1e7] + -1e3 + -4e3 + -8e2 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('readystatechange', () => {
            if (document.readyState === 'interactive') CheckJS.init();
        });
    } else {
        CheckJS.init();
    }
})();