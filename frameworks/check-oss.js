(function() {
    "use strict";

    const SCRIPT_SOURCE = (() => {
        try {
            const currentScript = document.currentScript;

            if (currentScript && currentScript.src) {
                console.log("[RedCheckOSS] ✅ Current check.js source detected");
                return currentScript.src;
            }

            const scripts = document.getElementsByTagName("script");

            if (!scripts || !scripts.length) {
                console.error("[RedCheckOSS] ❌ check.js source detection failed");
                return "";
            }

            for (let index = scripts.length - 1; index >= 0; index -= 1) {
                const script = scripts[index];

                if (!script) {
                    console.error("[RedCheckOSS] ❌ Script element is null");
                    continue;
                }

                if (typeof script.src !== "string" || !script.src) {
                    continue;
                }

                try {
                    const scriptUrl = new URL(script.src, document.baseURI);

                    if (scriptUrl.pathname.endsWith("/check.js")) {
                        console.log("[RedCheckOSS] ✅ check.js source found from script list");
                        return scriptUrl.href;
                    }
                } catch (error) {
                    console.error("[RedCheckOSS] ❌ Script URL parse error:", error);
                }
            }

            console.error("[RedCheckOSS] ❌ check.js source not found");
            return "";
        } catch (error) {
            console.error("[RedCheckOSS] ❌ Script source detection error:", error);
            return "";
        }
    })();

    const SCRIPT_CHECK_MODE = (() => {
        if (!SCRIPT_SOURCE) {
            console.warn("[RedCheckOSS] ⚠️ check.js mode unavailable; using normal mode");
            return null;
        }

        try {
            const scriptUrl = new URL(SCRIPT_SOURCE, document.baseURI);
            const checkValue = scriptUrl.searchParams.get("check");

            console.log(
                `[RedCheckOSS] ✅ check.js query detected:check=${checkValue || "(none)"}`
            );

            return checkValue;
        } catch (error) {
            console.error("[RedCheckOSS] ❌ check.js query parse error:", error);
            return null;
        }
    })();

    const RedCheckOSS = {
        CONFIG: {
            SUPABASE_EDGE_FUNC_URL: "https://lizrlulobdmxckyrsjfw.supabase.co/functions/v1/f",
            ENTRY_URL: "https://search3958.github.io/usercheck/entry.html",
            ABOUT_URL: "https://search3958.github.io/",
            POLICIES_URL: "https://search3958.github.io/policies/",
            TERMS_NOTICE_SHOWN_KEY: "RedCheckOSS_terms_notice_shown"
        },

        STATE: {
            scriptSource: SCRIPT_SOURCE,
            checkMode: SCRIPT_CHECK_MODE,
            uuid: null,
            termsState: null,
            serverStatus: null,
            initialized: false
        },

        async init() {
            const noCheck = this.STATE.checkMode === "none";

            console.log(
                `[RedCheckOSS] 🔧 MODE=${noCheck ? "check=none" : "normal"}`
            );

            let termsState = null;

            try {
                termsState = localStorage.getItem("termsAccepted");
                this.STATE.termsState = termsState;

                console.log(
                    `[RedCheckOSS] ✅ termsAccepted loaded:${termsState}`
                );
            } catch (error) {
                console.error(
                    "[RedCheckOSS] ❌ Failed to read termsAccepted:",
                    error
                );
            }

            const termsPending =
                termsState === null ||
                (typeof termsState === "string" && termsState.trim() === "");

            let noticeShown = false;

            try {
                noticeShown =
                    localStorage.getItem(this.CONFIG.TERMS_NOTICE_SHOWN_KEY) === "true";

                console.log(
                    `[RedCheckOSS] ✅ Terms notice state loaded:${noticeShown}`
                );
            } catch (error) {
                console.error(
                    "[RedCheckOSS] ❌ Failed to read initial notice state:",
                    error
                );
            }

            if (termsPending && !noticeShown) {
                try {
                    localStorage.setItem(
                        this.CONFIG.TERMS_NOTICE_SHOWN_KEY,
                        "true"
                    );

                    console.log("[RedCheckOSS] ✅ Initial notice flag saved");
                } catch (error) {
                    console.error(
                        "[RedCheckOSS] ❌ Failed to save initial notice flag:",
                        error
                    );
                }

                this.removeInfoWidget();
                this.injectConsentCard();

                console.log("[RedCheckOSS] 🛑 Initial processing stopped");
                return;
            }

            if (!noCheck && termsState === "false") {
                console.log(
                    "[RedCheckOSS] 🚫 Terms not accepted; redirecting to Entry"
                );

                window.location.replace(this.CONFIG.ENTRY_URL);
                return;
            }

            this.injectViewTransitionStyle();
            this.injectInfoWidget();

            let uuid = null;

            try {
                uuid = localStorage.getItem("uuid");

                console.log(
                    `[RedCheckOSS] ✅ UUID loaded:${uuid || "(none)"}`
                );
            } catch (error) {
                console.error(
                    "[RedCheckOSS] ❌ Failed to read UUID:",
                    error
                );
            }

            if (!uuid) {
                try {
                    uuid = this.generateUUID();
                    localStorage.setItem("uuid", uuid);

                    console.log(`[RedCheckOSS] ✅ NEW USER:${uuid}`);
                } catch (error) {
                    console.error(
                        "[RedCheckOSS] ❌ Failed to generate/save UUID:",
                        error
                    );

                    return;
                }
            }

            this.STATE.uuid = uuid;

            if (noCheck) {
                console.log(
                    "[RedCheckOSS] ℹ️ check=none: server check only"
                );

                const serverResult =
                    await this.checkServerStatus(uuid);

                const edgeStatus = serverResult.status;

                this.STATE.serverStatus = edgeStatus;

                console.log(
                    `[RedCheckOSS] 📡 SERVER ${edgeStatus} (check=none)`
                );

                if (edgeStatus === "blocked") {
                    console.log(
                        "[RedCheckOSS] ⚠️ BLACK LIST detected, but redirect is disabled because check=none"
                    );
                }

                if (termsPending) {
                    this.finalizeInitialAgreement();
                }

                this.STATE.initialized = true;

                console.log("[RedCheckOSS] ✅ check=none COMPLETE");
                return;
            }

            const serverResult =
                await this.checkServerStatus(uuid);

            const edgeStatus = serverResult.status;

            this.STATE.serverStatus = edgeStatus;

            console.log(
                `[RedCheckOSS] SERVER ${edgeStatus}`
            );

            if (edgeStatus === "blocked") {
                console.log("[RedCheckOSS] 🛑 BLACK LIST");

                window.location.replace(this.CONFIG.ENTRY_URL);
                return;
            }

            if (termsPending) {
                this.finalizeInitialAgreement();
            }

            this.STATE.initialized = true;

            console.log("[RedCheckOSS] ✅ INIT COMPLETE");
        },

        finalizeInitialAgreement() {
            try {
                localStorage.setItem("termsAccepted", "true");
                this.STATE.termsState = "true";

                console.log(
                    "[RedCheckOSS] ✅ termsAccepted=true after checks"
                );
            } catch (error) {
                console.error(
                    "[RedCheckOSS] ❌ Failed to save termsAccepted:",
                    error
                );
            }
        },

        injectConsentCard() {
            if (!document.body) {
                console.error(
                    "[RedCheckOSS] ❌ CONSENT CARD:document.body is unavailable"
                );
                return;
            }

            if (!document.head) {
                console.error(
                    "[RedCheckOSS] ❌ CONSENT CARD:document.head is unavailable"
                );
                return;
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-consent-card="true"]'
                )
            ) {
                console.log(
                    "[RedCheckOSS] ℹ️ CONSENT CARD already exists"
                );
                return;
            }

            this.removeInfoWidget();

            const style = document.createElement("style");

            if (!style) {
                console.error(
                    "[RedCheckOSS] ❌ CONSENT CARD style creation failed"
                );
                return;
            }

            style.setAttribute(
                "data-RedCheckOSS-style",
                "consent-card"
            );

            style.textContent = `
                .RedCheckOSS-consent-card{
                    position:fixed;
                    right:16px;
                    bottom:16px;
                    width:fit-content;
                    box-sizing:border-box;
                    z-index:2147483647;
                    pointer-events:none;
                    font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
                }

                .RedCheckOSS-consent-card__panel{
                    width:fit-content;
                    box-sizing:border-box;
                    padding:18px 18px 16px;
                    border-radius:32px;
                    corner-shape:superellipse(1.5);
                    background:#fff;
                    color:#000000;
                    box-shadow:0 12px 36px rgba(0,0,0,.32);
                    pointer-events:auto;
                }

                .RedCheckOSS-consent-card__title{
                    margin:0 0 10px;
                    font-size:22px;
                    line-height:1.35;
                    font-weight:700;
                }

                .RedCheckOSS-consent-card__text{
                    margin:0;
                    color:#000b;
                    font-size:13px;
                    line-height:1.7;
                }

                .RedCheckOSS-consent-card__actions{
                    display:flex;
                    align-items:center;
                    flex-wrap:wrap;
                    gap:6px;
                    margin-top:16px;
                }

                .RedCheckOSS-consent-card__button{
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    min-height:36px;
                    box-sizing:border-box;
                    padding:0 13px;
                    border:1px solid transparent;
                    border-radius:16px;
                    corner-shape:superellipse(1.5);
                    font:inherit;
                    font-size:12px;
                    font-weight:600;
                    line-height:1;
                    cursor:pointer;
                    text-decoration:none;
                    transition:transform .15s ease,background-color .15s ease,border-color .15s ease,opacity .15s ease;
                }

                .RedCheckOSS-consent-card__button:hover{
                    transform:translateY(-1px);
                }

                .RedCheckOSS-consent-card__button--document{
                    background:#00000009;
                    color:#000000;
                }

                .RedCheckOSS-consent-card__button--agree{
                    background:#08F480;
                    color:#000000;
                }

                @media(max-width:600px){
                    .RedCheckOSS-consent-card__panel{
                        padding:16px;
                    }

                    .RedCheckOSS-consent-card__title{
                        font-size:20px;
                    }

                    .RedCheckOSS-consent-card__button{
                        min-height:35px;
                        padding:0 11px;
                        font-size:11px;
                    }
                }

                @media(prefers-reduced-motion:reduce){
                    .RedCheckOSS-consent-card__button{
                        transition:none;
                    }
                }
            `;

            const card = document.createElement("div");

            if (!card) {
                console.error(
                    "[RedCheckOSS] ❌ CONSENT CARD container creation failed"
                );
                return;
            }

            card.className = "RedCheckOSS-consent-card";

            card.setAttribute(
                "data-RedCheckOSS-consent-card",
                "true"
            );

            const panel = document.createElement("div");

            if (!panel) {
                console.error(
                    "[RedCheckOSS] ❌ CONSENT CARD panel creation failed"
                );
                return;
            }

            panel.className = "RedCheckOSS-consent-card__panel";

            panel.setAttribute(
                "role",
                "dialog"
            );

            panel.setAttribute(
                "aria-modal",
                "false"
            );

            panel.setAttribute(
                "aria-labelledby",
                "RedCheckOSS-consent-card-title"
            );

            panel.innerHTML = `
                <h2
                    id="RedCheckOSS-consent-card-title"
                    class="RedCheckOSS-consent-card__title"
                >
                    ようこそ！
                </h2>

                <p class="RedCheckOSS-consent-card__text">
                    次回のアクセス以降，利用規約と<br>
                    個人情報政策に同意したものとします
                </p>

                <div class="RedCheckOSS-consent-card__actions">
                    <a
                        class="RedCheckOSS-consent-card__button RedCheckOSS-consent-card__button--document"
                        href="${this.CONFIG.POLICIES_URL}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        書類閲覧
                    </a>

                    <button
                        type="button"
                        class="RedCheckOSS-consent-card__button RedCheckOSS-consent-card__button--deny"
                        data-RedCheckOSS-consent-action="deny"
                    >
                        同意しない
                    </button>

                    <button
                        type="button"
                        class="RedCheckOSS-consent-card__button RedCheckOSS-consent-card__button--agree"
                        data-RedCheckOSS-consent-action="agree"
                    >
                        同意して閉じる
                    </button>
                </div>
            `;

            const agreeButton =
                panel.querySelector(
                    '[data-RedCheckOSS-consent-action="agree"]'
                );

            if (!agreeButton) {
                console.error(
                    "[RedCheckOSS] ❌ Agree button not found"
                );
                return;
            }

            const denyButton =
                panel.querySelector(
                    '[data-RedCheckOSS-consent-action="deny"]'
                );

            if (!denyButton) {
                console.error(
                    "[RedCheckOSS] ❌ Deny button not found"
                );
                return;
            }

            agreeButton.addEventListener("click", () => {
                try {
                    localStorage.setItem(
                        "termsAccepted",
                        "true"
                    );

                    this.STATE.termsState = "true";

                    console.log(
                        "[RedCheckOSS] ✅ USER AGREED"
                    );

                    card.remove();

                    console.log(
                        "[RedCheckOSS] ✅ CONSENT CARD CLOSED"
                    );

                    this.init().catch(error => {
                        console.error(
                            "[RedCheckOSS] ❌ Init failed after agreement:",
                            error
                        );
                    });
                } catch (error) {
                    console.error(
                        "[RedCheckOSS] ❌ Agreement handling failed:",
                        error
                    );
                }
            });

            denyButton.addEventListener("click", () => {
                try {
                    localStorage.setItem(
                        "termsAccepted",
                        "false"
                    );

                    this.STATE.termsState = "false";

                    console.log(
                        "[RedCheckOSS] 🚫 USER DENIED"
                    );

                    window.location.replace(
                        this.CONFIG.ENTRY_URL
                    );
                } catch (error) {
                    console.error(
                        "[RedCheckOSS] ❌ Deny handling failed:",
                        error
                    );
                }
            });

            document.head.appendChild(style);
            card.appendChild(panel);
            document.body.appendChild(card);

            console.log(
                "[RedCheckOSS] ✅ CONSENT CARD OK"
            );
        },

        async checkServerStatus(uuid) {
            if (!uuid) {
                console.error(
                    "[RedCheckOSS] ❌ SERVER CHECK:UUID is missing"
                );

                return {
                    status: "normal"
                };
            }

            try {
                const response = await fetch(
                    this.CONFIG.SUPABASE_EDGE_FUNC_URL,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            uuid,
                            url: window.location.href,
                            action: "check"
                        })
                    }
                );

                if (!response.ok) {
                    let errorData = {};

                    try {
                        errorData = await response.json();
                    } catch (jsonError) {
                        console.error(
                            "[RedCheckOSS] 🟥 EDGE FUNC JSON ERROR:",
                            jsonError
                        );
                    }

                    console.error(
                        "[RedCheckOSS] 🟥 EDGE FUNC ERROR:",
                        errorData.error ||
                            `HTTP ${response.status}`
                    );

                    return {
                        status: "normal"
                    };
                }

                const data = await response.json();

                if (!data) {
                    console.error(
                        "[RedCheckOSS] ❌ EDGE FUNC EMPTY RESPONSE"
                    );

                    return {
                        status: "normal"
                    };
                }

                console.log(
                    "[RedCheckOSS] ✅ EDGE FUNC"
                );

                return data;
            } catch (error) {
                console.error(
                    "[RedCheckOSS] 🟥 EDGE FUNC ERROR:",
                    error
                );

                return {
                    status: "normal"
                };
            }
        },

        generateUUID() {
            try {
                if (
                    !window.crypto ||
                    typeof window.crypto.randomUUID !==
                        "function"
                ) {
                    throw new Error(
                        "crypto.randomUUID unavailable"
                    );
                }

                const uuid =
                    window.crypto.randomUUID();

                console.log(
                    "[RedCheckOSS] ✅ UUID DONE"
                );

                return uuid;
            } catch (error) {
                console.warn(
                    "[RedCheckOSS] ⚠️ crypto.randomUUID unavailable:",
                    error
                );

                if (
                    !window.crypto ||
                    typeof window.crypto.getRandomValues !==
                        "function"
                ) {
                    console.error(
                        "[RedCheckOSS] ❌ UUID generation API unavailable"
                    );

                    throw error;
                }

                const fallbackUUID =
                    ([1e7] +
                        -1e3 +
                        -4e3 +
                        -8e2 +
                        -1e11).replace(
                        /[018]/g,
                        c =>
                            (
                                c ^
                                (
                                    crypto.getRandomValues(
                                        new Uint8Array(1)
                                    )[0] &
                                    (15 >>
                                        (c / 4))
                                )
                            ).toString(16)
                    );

                console.log(
                    "[RedCheckOSS] ✅ FALLBACK UUID DONE"
                );

                return fallbackUUID;
            }
        },

        setupLogoDiagnostic() {
            if (!document.body) {
                console.error(
                    "[RedCheckOSS] ❌ LOGO DEBUG:document.body is unavailable"
                );
                return;
            }

            const diagnosticSelector =
                '[data-RedCheckOSS-logo-diagnostic="true"]';

            if (
                document.querySelector(
                    diagnosticSelector
                )
            ) {
                console.log(
                    "[RedCheckOSS] ℹ️ LOGO DEBUG already attached"
                );
                return;
            }

            const attach = logoElement => {
                if (!logoElement) {
                    console.error(
                        "[RedCheckOSS] ❌ LOGO DEBUG:logo is null"
                    );
                    return false;
                }

                if (!logoElement.classList) {
                    console.error(
                        "[RedCheckOSS] ❌ LOGO DEBUG:classList unavailable"
                    );
                    return false;
                }

                if (
                    logoElement.getAttribute(
                        "data-RedCheckOSS-logo-diagnostic"
                    ) === "true"
                ) {
                    console.log(
                        "[RedCheckOSS] ℹ️ LOGO DEBUG already attached"
                    );
                    return true;
                }

                logoElement.classList.add(
                    "RedCheckOSS-logo-diagnostic-trigger"
                );

                logoElement.setAttribute(
                    "data-RedCheckOSS-logo-diagnostic",
                    "true"
                );

                logoElement.setAttribute(
                    "tabindex",
                    "0"
                );

                logoElement.setAttribute(
                    "role",
                    "button"
                );

                logoElement.setAttribute(
                    "aria-label",
                    "Red Check debug"
                );

                logoElement.style.cursor =
                    "pointer";

                let clickCount = 0;
                let resetTimer = null;

                const clickWindowMs = 1800;

                const handlePress = () => {
                    clickCount += 1;

                    console.log(
                        `[RedCheckOSS] 🔎 LOGO DEBUG TAP ${clickCount}/5`
                    );

                    if (resetTimer !== null) {
                        window.clearTimeout(
                            resetTimer
                        );

                        resetTimer = null;
                    }

                    if (clickCount >= 5) {
                        clickCount = 0;

                        console.log(
                            "[RedCheckOSS] 🔎 LOGO DEBUG TRIGGERED"
                        );

                        this.showDebugState();

                        return;
                    }

                    resetTimer =
                        window.setTimeout(() => {
                            clickCount = 0;
                            resetTimer = null;

                            console.log(
                                "[RedCheckOSS] 🔎 LOGO DEBUG click count reset"
                            );
                        }, clickWindowMs);
                };

                logoElement.addEventListener(
                    "click",
                    handlePress
                );

                logoElement.addEventListener(
                    "keydown",
                    event => {
                        if (!event) {
                            console.error(
                                "[RedCheckOSS] ❌ LOGO DEBUG:keydown event is null"
                            );
                            return;
                        }

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();
                            handlePress();
                        }
                    }
                );

                console.log(
                    "[RedCheckOSS] ✅ INJECTED LOGO DEBUG ATTACHED"
                );

                return true;
            };

            const findInjectedLogo = () => {
                const toggle =
                    document.querySelector(
                        '[data-RedCheckOSS-info-widget="true"] .RedCheckOSS-info-widget__toggle'
                    );

                if (!toggle) {
                    console.warn(
                        "[RedCheckOSS] ⚠️ INJECTED LOGO not available yet"
                    );

                    return null;
                }

                return toggle;
            };

            const initialLogo =
                findInjectedLogo();

            if (initialLogo) {
                attach(initialLogo);
                return;
            }

            const observer =
                new MutationObserver(() => {
                    const logo =
                        findInjectedLogo();

                    if (!logo) {
                        return;
                    }

                    console.log(
                        "[RedCheckOSS] ✅ Dynamic injected logo detected"
                    );

                    const attached =
                        attach(logo);

                    if (attached) {
                        observer.disconnect();

                        console.log(
                            "[RedCheckOSS] ✅ LOGO DEBUG observer stopped"
                        );
                    }
                });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log(
                "[RedCheckOSS] ✅ LOGO DEBUG observer started"
            );
        },

        showDebugState() {
            try {
                const state = {
                    "RedFlag-Checker-OSS": "3",
                    모드:
                        this.STATE.checkMode === "none"
                            ? "check=none"
                            : "normal",
                    소스:
                        this.STATE.scriptSource || null,
                    UUID:
                        this.STATE.uuid || null,
                    리용약관동의상태:
                        this.STATE.termsState,
                    봉사중심상태:
                        this.STATE.serverStatus,
                    현재위치:
                        window.location.href,
                    현재리용상태:
                        document.readyState,
                    리용자언어:
                        navigator.language,
                    리용자환경:
                        navigator.userAgent,
                    시간:
                        new Date().toISOString()
                };

                console.log(
                    "[RedCheckOSS] 🔎 DEBUG STATE:",
                    state
                );

                const alertMessage =
                    Object.entries(state)
                        .map(
                            ([key, value]) =>
                                `${key}:${value}`
                        )
                        .join("\n");

                window.alert(
                    alertMessage
                );

                console.log(
                    "[RedCheckOSS] ✅ DEBUG DIALOG DISPLAYED"
                );
            } catch (error) {
                console.error(
                    "[RedCheckOSS] ❌ DEBUG STATE ERROR:",
                    error
                );
            }
        },

        safeJSON(str) {
            if (typeof str !== "string") {
                return str;
            }

            try {
                return JSON.parse(str);
            } catch (error) {
                console.warn(
                    "[RedCheckOSS] ⚠️ JSON ERROR:",
                    error
                );

                return str;
            }
        },

        injectInfoWidget() {
            if (!document.body) {
                console.error(
                    "[RedCheckOSS] ❌ INFO WIDGET:document.body is unavailable"
                );
                return;
            }

            if (!document.head) {
                console.error(
                    "[RedCheckOSS] ❌ INFO WIDGET:document.head is unavailable"
                );
                return;
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-consent-card="true"]'
                )
            ) {
                return;
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-info-widget="true"]'
                )
            ) {
                console.log(
                    "[RedCheckOSS] ℹ️ INFO WIDGET already exists"
                );

                this.setupLogoDiagnostic();

                return;
            }

            const style =
                document.createElement("style");

            if (!style) {
                console.error(
                    "[RedCheckOSS] ❌ INFO WIDGET style creation failed"
                );
                return;
            }

            style.setAttribute(
                "data-RedCheckOSS-style",
                "info-widget"
            );

            style.textContent = `
                .RedCheckOSS-info-widget{
                    position:fixed;
                    right:16px;
                    bottom:16px;
                    z-index:2147483646;
                    display:flex;
                    flex-direction:row-reverse;
                    align-items:stretch;
                    gap:0;
                    padding:5px;
                    background:rgba(0,0,0,.3);
                    border:none;
                    border-radius:99px;
                    corner-shape:superellipse(1.5);
                    backdrop-filter:blur(4px);
                    -webkit-backdrop-filter:blur(4px);
                    font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
                    overflow:hidden;
                }

                .RedCheckOSS-info-widget:hover{
                    background:rgba(0,0,0,.8);
                }

                .RedCheckOSS-info-widget__toggle{
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex:0 0 20px;
                    width:20px;
                    height:20px;
                    padding:0;
                    margin:2px;
                    border:0;
                    color:#fff9;
                }

                .RedCheckOSS-info-widget__toggle svg{
                    display:block;
                    width:22px;
                    height:22px;
                    fill:currentColor;
                }

                .RedCheckOSS-info-widget__links{
                    display:flex;
                    gap:4px;
                    max-width:0;
                    max-height:0;
                    opacity:0;
                    overflow:hidden;
                    transform:translateY(3px);
                    transition:max-width .2s ease,max-height .2s ease,opacity .2s ease,transform .2s ease;
                }

                .RedCheckOSS-info-widget:hover .RedCheckOSS-info-widget__links,
                .RedCheckOSS-info-widget:focus-within .RedCheckOSS-info-widget__links{
                    max-width:280px;
                    max-height:120px;
                    opacity:1;
                    transform:translateY(0);
                }

                .RedCheckOSS-info-widget__link{
                    display:block;
                    padding:6px;
                    border-radius:99px;
                    corner-shape:superellipse(1.6);
                    background:#0000;
                    color:#e3e3e3;
                    text-decoration:none;
                    white-space:nowrap;
                    font-size:12px;
                    font-weight:500;
                    line-height:1 !important;
                    transition:background-color .15s ease,color .15s ease;
                }

                .RedCheckOSS-info-widget__link:hover,
                .RedCheckOSS-info-widget__link:focus-visible{
                    background:#fff3;
                    color:#ffffff;
                    outline:none;
                }

                @media(max-width:600px){
                    .RedCheckOSS-info-widget{
                        right:10px;
                        bottom:10px;
                    }

                    .RedCheckOSS-info-widget__link{
                        font-size:11px;
                    }
                }

                @media(prefers-reduced-motion:reduce){
                    .RedCheckOSS-info-widget,
                    .RedCheckOSS-info-widget__links,
                    .RedCheckOSS-info-widget__toggle,
                    .RedCheckOSS-info-widget__link{
                        transition:none;
                    }
                }
            `;

            const toggle =
                document.createElement("div");

            if (!toggle) {
                console.error(
                    "[RedCheckOSS] ❌ INFO TOGGLE creation failed"
                );
                return;
            }

            toggle.className =
                "RedCheckOSS-info-widget__toggle";

            toggle.setAttribute(
                "aria-hidden",
                "true"
            );

            toggle.innerHTML = `
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g clip-path="url(#clip0_57_48)">
                        <path d="M0 0H12V12L0 7V0Z" fill="url(#paint0_linear_57_48_red_flag)" />
                        <path d="M24 24H12V12L24 17V24Z" fill="url(#paint1_linear_57_48_red_flag)" />
                        <path d="M12 0L24 5V12H12V0Z" fill="url(#paint2_linear_57_48_red_flag)" />
                        <path d="M12 7L24 12H12V7Z" fill="url(#paint3_linear_57_48_red_flag)" />
                        <path d="M12 24L0 19V12H12V24Z" fill="url(#paint4_linear_57_48_red_flag)" />
                        <path d="M12 17L0 12H12V17Z" fill="url(#paint5_linear_57_48_red_flag)" />
                    </g>

                    <defs>
                        <linearGradient
                            id="paint0_linear_57_48_red_flag"
                            x1="0"
                            y1="6"
                            x2="12"
                            y2="6"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>

                        <linearGradient
                            id="paint1_linear_57_48_red_flag"
                            x1="24"
                            y1="18"
                            x2="12"
                            y2="18"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>

                        <linearGradient
                            id="paint2_linear_57_48_red_flag"
                            x1="12"
                            y1="6"
                            x2="24"
                            y2="6"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>

                        <linearGradient
                            id="paint3_linear_57_48_red_flag"
                            x1="12"
                            y1="9.5"
                            x2="24"
                            y2="9.5"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>

                        <linearGradient
                            id="paint4_linear_57_48_red_flag"
                            x1="12"
                            y1="18"
                            x2="0"
                            y2="18"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>

                        <linearGradient
                            id="paint5_linear_57_48_red_flag"
                            x1="12"
                            y1="14.5"
                            x2="0"
                            y2="14.5"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>

                        <clipPath id="clip0_57_48">
                            <rect width="24" height="24" fill="white" />
                        </clipPath>
                    </defs>
                </svg>
            `;

            const links =
                document.createElement("div");

            if (!links) {
                console.error(
                    "[RedCheckOSS] ❌ INFO LINKS creation failed"
                );
                return;
            }

            links.className =
                "RedCheckOSS-info-widget__links";

            const aboutLink =
                document.createElement("a");

            if (!aboutLink) {
                console.error(
                    "[RedCheckOSS] ❌ ABOUT LINK creation failed"
                );
                return;
            }

            aboutLink.className =
                "RedCheckOSS-info-widget__link";

            aboutLink.href =
                this.CONFIG.ABOUT_URL;

            aboutLink.textContent =
                "私について";

            aboutLink.setAttribute(
                "aria-label",
                "私について"
            );

            const policyLink =
                document.createElement("a");

            if (!policyLink) {
                console.error(
                    "[RedCheckOSS] ❌ POLICY LINK creation failed"
                );
                return;
            }

            policyLink.className =
                "RedCheckOSS-info-widget__link";

            policyLink.href =
                this.CONFIG.POLICIES_URL;

            policyLink.textContent =
                "利用規約および個人情報政策";

            policyLink.setAttribute(
                "aria-label",
                "利用規約および個人情報政策"
            );

            links.appendChild(aboutLink);
            links.appendChild(policyLink);

            const widget =
                document.createElement("div");

            if (!widget) {
                console.error(
                    "[RedCheckOSS] ❌ WIDGET creation failed"
                );
                return;
            }

            widget.className =
                "RedCheckOSS-info-widget";

            widget.setAttribute(
                "data-RedCheckOSS-info-widget",
                "true"
            );

            widget.setAttribute(
                "aria-label",
                "サイト情報"
            );

            widget.appendChild(toggle);
            widget.appendChild(links);

            document.head.appendChild(style);
            document.body.appendChild(widget);

            console.log(
                "[RedCheckOSS] ✅ INFO WIDGET OK"
            );

            this.setupLogoDiagnostic();
        },

        removeInfoWidget() {
            const widgets =
                document.querySelectorAll(
                    '[data-RedCheckOSS-info-widget="true"]'
                );

            if (!widgets.length) {
                console.log(
                    "[RedCheckOSS] ℹ️ INFO WIDGET nothing to remove"
                );
                return;
            }

            widgets.forEach(widget => {
                if (!widget) {
                    console.error(
                        "[RedCheckOSS] ❌ INFO WIDGET removal target is null"
                    );
                    return;
                }

                widget.remove();

                console.log(
                    "[RedCheckOSS] ✅ INFO WIDGET REMOVED"
                );
            });
        },

        injectViewTransitionStyle() {
            const head =
                document.head ||
                document.documentElement;

            if (!head) {
                console.error(
                    "[RedCheckOSS] ❌ VIEW TRANSITION HEAD ERROR"
                );
                return;
            }

            const existingMeta =
                document.querySelector(
                    'meta[name="view-transition"]'
                );

            if (!existingMeta) {
                const meta =
                    document.createElement("meta");

                if (!meta) {
                    console.error(
                        "[RedCheckOSS] ❌ VIEW TRANSITION META creation failed"
                    );
                    return;
                }

                meta.name =
                    "view-transition";

                meta.content =
                    "same-origin";

                head.appendChild(meta);

                console.log(
                    "[RedCheckOSS] ✅ VIEW TRANSITION META"
                );
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-style="view-transition"]'
                )
            ) {
                return;
            }

            const style =
                document.createElement("style");

            if (!style) {
                console.error(
                    "[RedCheckOSS] ❌ VIEW TRANSITION STYLE creation failed"
                );
                return;
            }

            style.setAttribute(
                "data-RedCheckOSS-style",
                "view-transition"
            );

            style.textContent = `
                @view-transition{
                    navigation:auto;
                }

                ::view-transition-old(root){
                    animation:fade-and-scale-out 0.6s cubic-bezier(.4,.04,0,1);
                }

                ::view-transition-new(root){
                    animation:fade-and-scale-in 0.6s cubic-bezier(.4,.04,0,1);
                }

                @keyframes fade-and-scale-out{
                    to{
                        opacity:0;
                        transform:scale(.9);
                    }
                }

                @keyframes fade-and-scale-in{
                    from{
                        opacity:0;
                        transform:scale(.9);
                    }
                }
            `;

            head.appendChild(style);

            console.log(
                "[RedCheckOSS] ✅ VIEW TRANSITION STYLE"
            );
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                console.log(
                    "[RedCheckOSS] ✅ DOMContentLoaded"
                );

                RedCheckOSS.init().catch(error => {
                    console.error(
                        "[RedCheckOSS] ❌ INIT FATAL ERROR:",
                        error
                    );
                });
            },
            {
                once: true
            }
        );
    } else {
        RedCheckOSS.init().catch(error => {
            console.error(
                "[RedCheckOSS] ❌ INIT FATAL ERROR:",
                error
            );
        });
    }
})();