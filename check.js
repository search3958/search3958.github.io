(function() {
    "use strict";
    const CheckJS = {
        CONFIG: {
            AD_SCRIPT_URL: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874',
            ERROR_URL: 'https://search3958.github.io/usercheck/aderror.html',
            ENTRY_URL: 'https://search3958.github.io/usercheck/entry.html',
            FETCH_TIMEOUT: 8000,
            BLACKLIST_UUIDS: [
                '00000000-0000-0000-0000-000000000000', // 絶対に存在しないダミーUUID
                'ffffffff-ffff-ffff-ffff-ffffffffffff'  
            ]
        },

        // UUIDを生成する補助関数
        generateUUID() {
            return ([1e7]+-1e3+-4e3+-8e2+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },

        // UUIDの管理とブラックリスト判定
        manageUserAccess() {
            let currentUuid = localStorage.getItem('uuid');
            
            // 1. UUIDがなければ新規保存
            if (!currentUuid) {
                currentUuid = this.generateUUID();
                localStorage.setItem('uuid', currentUuid);
                console.log(`✅🆕 CheckJS-UUIDがリセットされました`);
            }

            // 2. ブラックリスト判定
            if (this.CONFIG.BLACKLIST_UUIDS.includes(currentUuid)) {
                console.warn("✅⚠️ CheckJS-ブラックリストと一致します");
                window.location.replace(this.CONFIG.ENTRY_URL);
                return false; // アクセス拒否
            }

            return true; // アクセス許可
        },

        async init() {
            console.log("✅🟢 CheckJS-正常に読み込まれました");

            // --- 1. UUID管理とアクセス判定 (最優先) ---
            const isAllowed = this.manageUserAccess();
            if (!isAllowed) return; 

            // --- 2. 既存の規約同意チェック ---
            if (localStorage.getItem('termsAccepted') === 'false') {
                window.location.replace(this.CONFIG.ENTRY_URL);
                return;
            }

            // --- 3. 広告スクリプトの検証 ---
            try {
                console.log("✅🟡 CheckJS-確認中(1回目)");
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.FETCH_TIMEOUT);
                
                const response = await fetch(this.CONFIG.AD_SCRIPT_URL, {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error('Network error');
                
                const text = await response.text();
                const isLengthValid = text.length >= 5000 && text.length < 200000;
                const lineCount = (text.match(/\n/g) || []).length;
                const isLineCountValid = lineCount < 1000;
                const hasLicense = text.includes('SPDX-License-Identifier') && text.includes('Apache-2.0');

                if (!isLengthValid || !isLineCountValid || !hasLicense) {
                    this.handleFailure("Validation Details:", {
                        length: text.length,
                        lines: lineCount,
                        license: hasLicense
                    });
                    return;
                }

                console.log("✅🔵 CheckJS-検証済み(正常)");
                const script = document.createElement('script');
                script.textContent = text;
                document.head.appendChild(script);

                this.verifyObjectPresence();

            } catch (error) {
                this.handleFailure("問題があります");
            }
        },

        verifyObjectPresence() {
            setTimeout(() => {
                console.log("✅🟡 CheckJS-確認中(2回目)");
                if (!window.adsbygoogle) {
                    this.handleFailure("問題があります");
                } else {
                    console.log("✅🔵 CheckJS-検証済み(最終正常)");
                }
            }, 2500);
        },

        handleFailure(reason, details = null) {
            console.error(`✅🛑 CheckJS-${reason}`);
            if (details) console.error(details);
            window.location.replace(this.CONFIG.ERROR_URL);
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