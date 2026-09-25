(function() {
    "use strict";

    const LOG_PREFIX = "[RedCheckOSS]";
    const HEAVY_SCRIPT_ATTR = "data-RedCheckOSS-heavy-script";

    const SCRIPT_SOURCE = (() => {
        try {
            const currentScript = document.currentScript;

            if (currentScript && currentScript.src) {
                return currentScript.src;
            }

            const scripts = document.getElementsByTagName("script");

            for (let index = scripts.length - 1; index >= 0; index -= 1) {
                const script = scripts[index];

                if (!script || typeof script.src !== "string" || !script.src) {
                    continue;
                }

                try {
                    const scriptUrl = new URL(script.src, document.baseURI);
                    if (scriptUrl.pathname.endsWith("/check.js")) {
                        return scriptUrl.href;
                    }
                } catch (error) {
                    console.error(
                        `${LOG_PREFIX} ❌ Script URL parse error:`,
                        error
                    );
                }
            }

            return "";
        } catch (error) {
            console.error(
                `${LOG_PREFIX} ❌ Script source detection error:`,
                error
            );
            return "";
        }
    })();

    const SCRIPT_CHECK_MODE = (() => {
        if (!SCRIPT_SOURCE) {
            return null;
        }

        try {
            return new URL(
                SCRIPT_SOURCE,
                document.baseURI
            ).searchParams.get("check");
        } catch (error) {
            console.error(
                `${LOG_PREFIX} ❌ check.js query parse error:`,
                error
            );
            return null;
        }
    })();

    const RedCheckOSS = {
        CONFIG: {
            SUPABASE_EDGE_FUNC_URL:
                "https://lizrlulobdmxckyrsjfw.supabase.co/functions/v1/f",
            ENTRY_URL:
                "https://search3958.github.io/usercheck/entry.html",
            ABOUT_URL:
                "https://search3958.github.io/",
            POLICIES_URL:
                "https://search3958.github.io/policies/",
            TERMS_NOTICE_SHOWN_KEY:
                "RedCheckOSS_terms_notice_shown",
            HEAVY_SCRIPT_NAME:
                "https://search3958.github.io/frameworks/check-oss-uuid.js"//check-oss-uuid.jsを解析,クローンしてはなりません。ライセンスで強く保護されています。
        },

        STATE: {
            scriptSource: SCRIPT_SOURCE,
            checkMode: SCRIPT_CHECK_MODE,
            uuid: null,
            termsState: null,
            serverStatus: null,
            initialized: false,
            heavyLoadPromise: null
        },

        async init() {
            console.log(
                `${LOG_PREFIX} 🔧 MODE=${
                    this.STATE.checkMode === "none"
                        ? "check=none"
                        : "normal"
                }`
            );

            // Heavy is mandatory and is loaded before any core processing.
            let heavy;
            try {
                heavy = await this.loadHeavyScript();
            } catch (error) {
                console.error(
                    `${LOG_PREFIX} ❌ Heavy module is required but failed to load:`,
                    error
                );
                return;
            }

            if (
                !heavy ||
                typeof heavy.generateUUID !== "function" ||
                typeof heavy.checkServerStatus !== "function"
            ) {
                console.error(
                    `${LOG_PREFIX} ❌ Heavy core is unavailable`
                );
                return;
            }

            let termsState = null;

            try {
                termsState = localStorage.getItem("termsAccepted");
                this.STATE.termsState = termsState;
            } catch (error) {
                console.error(
                    `${LOG_PREFIX} ❌ Failed to read termsAccepted:`,
                    error
                );
            }

            const termsPending =
                termsState === null ||
                (typeof termsState === "string" && termsState.trim() === "");

            let noticeShown = false;

            try {
                noticeShown =
                    localStorage.getItem(
                        this.CONFIG.TERMS_NOTICE_SHOWN_KEY
                    ) === "true";
            } catch (error) {
                console.error(
                    `${LOG_PREFIX} ❌ Failed to read initial notice state:`,
                    error
                );
            }

            if (termsPending && !noticeShown) {
                const injected = this.injectConsentCard();

                if (!injected) {
                    console.error(
                        `${LOG_PREFIX} ❌ Initial consent UI injection failed`
                    );
                    return;
                }

                try {
                    localStorage.setItem(
                        this.CONFIG.TERMS_NOTICE_SHOWN_KEY,
                        "true"
                    );
                } catch (error) {
                    console.error(
                        `${LOG_PREFIX} ❌ Failed to save initial notice flag:`,
                        error
                    );
                }

                return;
            }

            if (
                this.STATE.checkMode !== "none" &&
                termsState === "false"
            ) {
                window.location.replace(this.CONFIG.ENTRY_URL);
                return;
            }

            let uuid = null;

            try {
                uuid = localStorage.getItem("uuid");
            } catch (error) {
                console.error(
                    `${LOG_PREFIX} ❌ Failed to read UUID:`,
                    error
                );
            }

            if (!uuid) {
                try {
                    uuid = heavy.generateUUID();
                    localStorage.setItem("uuid", uuid);
                } catch (error) {
                    console.error(
                        `${LOG_PREFIX} ❌ Failed to generate/save UUID:`,
                        error
                    );
                    return;
                }
            }

            this.STATE.uuid = uuid;

            try {
                const serverResult =
                    await heavy.checkServerStatus(uuid);

                this.STATE.serverStatus =
                    serverResult.status;

                if (
                    this.STATE.checkMode !== "none" &&
                    serverResult.status === "blocked"
                ) {
                    window.location.replace(
                        this.CONFIG.ENTRY_URL
                    );
                    return;
                }

                if (termsPending) {
                    try {
                        localStorage.setItem(
                            "termsAccepted",
                            "true"
                        );
                        this.STATE.termsState = "true";
                    } catch (error) {
                        console.error(
                            `${LOG_PREFIX} ❌ Failed to save termsAccepted:`,
                            error
                        );
                    }
                }

                this.injectViewTransitionStyle();
                this.injectInfoWidget();
                this.STATE.initialized = true;
            } catch (error) {
                console.error(
                    `${LOG_PREFIX} ❌ Heavy module execution failed:`,
                    error
                );
            }
        },

        async loadHeavyScript() {
            if (
                window.RedCheckOSSHeavy &&
                typeof window.RedCheckOSSHeavy.checkServerStatus === "function" &&
                typeof window.RedCheckOSSHeavy.generateUUID === "function"
            ) {
                return window.RedCheckOSSHeavy;
            }

            if (this.STATE.heavyLoadPromise) {
                return this.STATE.heavyLoadPromise;
            }

            this.STATE.heavyLoadPromise = new Promise((resolve, reject) => {
                const target =
                    document.head ||
                    document.documentElement;

                if (!target) {
                    reject(
                        new Error("No valid script injection target")
                    );
                    return;
                }

                const existingScript =
                    document.querySelector(
                        `script[${HEAVY_SCRIPT_ATTR}="true"]`
                    );

                if (existingScript) {
                    if (
                        window.RedCheckOSSHeavy &&
                        typeof window.RedCheckOSSHeavy.checkServerStatus === "function" &&
                        typeof window.RedCheckOSSHeavy.generateUUID === "function"
                    ) {
                        resolve(window.RedCheckOSSHeavy);
                        return;
                    }
                }

                let heavyUrl;

                try {
                    heavyUrl = new URL(
                        this.CONFIG.HEAVY_SCRIPT_NAME,
                        this.STATE.scriptSource ||
                            document.baseURI ||
                            window.location.href
                    ).href;
                } catch (error) {
                    reject(error);
                    return;
                }

                const script = document.createElement("script");
                script.src = heavyUrl;
                script.async = false;
                script.setAttribute(HEAVY_SCRIPT_ATTR, "true");

                script.onload = () => {
                    if (
                        window.RedCheckOSSHeavy &&
                        typeof window.RedCheckOSSHeavy.checkServerStatus === "function" &&
                        typeof window.RedCheckOSSHeavy.generateUUID === "function"
                    ) {
                        resolve(window.RedCheckOSSHeavy);
                        return;
                    }

                    reject(
                        new Error("RedCheckOSSHeavy global was not initialized")
                    );
                };

                script.onerror = event => {
                    reject(
                        new Error(`Failed to load ${heavyUrl}`)
                    );
                };

                target.appendChild(script);
            });

            try {
                return await this.STATE.heavyLoadPromise;
            } catch (error) {
                this.STATE.heavyLoadPromise = null;
                throw error;
            }
        },

        injectConsentCard() {
            if (!document.body || !document.head) {
                return false;
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-consent-card="true"]'
                )
            ) {
                return true;
            }

            this.removeInfoWidget();

            const style = document.createElement("style");
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
                    color:#000;
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
                    color:#000;
                }
                .RedCheckOSS-consent-card__button--deny{
                    background:#eee;
                    color:#000;
                }
                .RedCheckOSS-consent-card__button--agree{
                    background:#08F480;
                    color:#000;
                }
                @media(max-width:600px){
                    .RedCheckOSS-consent-card__panel{padding:16px}
                    .RedCheckOSS-consent-card__title{font-size:20px}
                    .RedCheckOSS-consent-card__button{
                        min-height:35px;
                        padding:0 11px;
                        font-size:11px;
                    }
                }
                @media(prefers-reduced-motion:reduce){
                    .RedCheckOSS-consent-card__button{transition:none}
                }
            `;

            const card = document.createElement("div");
            const panel = document.createElement("div");

            card.className = "RedCheckOSS-consent-card";
            card.setAttribute(
                "data-RedCheckOSS-consent-card",
                "true"
            );

            panel.className = "RedCheckOSS-consent-card__panel";
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "false");
            panel.setAttribute(
                "aria-labelledby",
                "RedCheckOSS-consent-card-title"
            );

            panel.innerHTML = `
                <h2
                    id="RedCheckOSS-consent-card-title"
                    class="RedCheckOSS-consent-card__title"
                >ようこそ！</h2>
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
                    >書類閲覧</a>
                    <button
                        type="button"
                        class="RedCheckOSS-consent-card__button RedCheckOSS-consent-card__button--deny"
                        data-RedCheckOSS-consent-action="deny"
                    >同意しない</button>
                    <button
                        type="button"
                        class="RedCheckOSS-consent-card__button RedCheckOSS-consent-card__button--agree"
                        data-RedCheckOSS-consent-action="agree"
                    >同意して閉じる</button>
                </div>
            `;

            const agreeButton =
                panel.querySelector(
                    '[data-RedCheckOSS-consent-action="agree"]'
                );
            const denyButton =
                panel.querySelector(
                    '[data-RedCheckOSS-consent-action="deny"]'
                );

            if (!agreeButton || !denyButton) {
                return false;
            }

            agreeButton.addEventListener("click", () => {
                try {
                    localStorage.setItem("termsAccepted", "true");
                    this.STATE.termsState = "true";
                    card.remove();
                    this.init().catch(error => {
                        console.error(
                            `${LOG_PREFIX} ❌ Init failed after agreement:`,
                            error
                        );
                    });
                } catch (error) {
                    console.error(
                        `${LOG_PREFIX} ❌ Agreement handling failed:`,
                        error
                    );
                }
            });

            denyButton.addEventListener("click", () => {
                try {
                    localStorage.setItem("termsAccepted", "false");
                    this.STATE.termsState = "false";
                    window.location.replace(this.CONFIG.ENTRY_URL);
                } catch (error) {
                    console.error(
                        `${LOG_PREFIX} ❌ Deny handling failed:`,
                        error
                    );
                }
            });

            document.head.appendChild(style);
            card.appendChild(panel);
            document.body.appendChild(card);
            return true;
        },

        injectInfoWidget() {
            if (!document.body || !document.head) {
                return false;
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-consent-card="true"]'
                )
            ) {
                return false;
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-info-widget="true"]'
                )
            ) {
                this.setupLogoDiagnostic();
                return true;
            }

            const style = document.createElement("style");
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
                .RedCheckOSS-info-widget:hover{background:rgba(0,0,0,.8)}
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
                    color:#fff;
                    outline:none;
                }
                @media(max-width:600px){
                    .RedCheckOSS-info-widget{
                        right:10px;
                        bottom:10px;
                    }
                    .RedCheckOSS-info-widget__link{font-size:11px}
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

            const toggle = document.createElement("div");
            toggle.className = "RedCheckOSS-info-widget__toggle";
            toggle.setAttribute("aria-hidden", "true");
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
                        <linearGradient id="paint0_linear_57_48_red_flag" x1="0" y1="6" x2="12" y2="6" gradientUnits="userSpaceOnUse">
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>
                        <linearGradient id="paint1_linear_57_48_red_flag" x1="24" y1="18" x2="12" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>
                        <linearGradient id="paint2_linear_57_48_red_flag" x1="12" y1="6" x2="24" y2="6" gradientUnits="userSpaceOnUse">
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>
                        <linearGradient id="paint3_linear_57_48_red_flag" x1="12" y1="9.5" x2="24" y2="9.5" gradientUnits="userSpaceOnUse">
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>
                        <linearGradient id="paint4_linear_57_48_red_flag" x1="12" y1="18" x2="0" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>
                        <linearGradient id="paint5_linear_57_48_red_flag" x1="12" y1="14.5" x2="0" y2="14.5" gradientUnits="userSpaceOnUse">
                            <stop stop-color="white" stop-opacity="0.34" />
                            <stop offset="1" stop-color="white" stop-opacity="0.83" />
                        </linearGradient>
                        <clipPath id="clip0_57_48">
                            <rect width="24" height="24" fill="white" />
                        </clipPath>
                    </defs>
                </svg>
            `;

            const links = document.createElement("div");
            links.className = "RedCheckOSS-info-widget__links";

            const aboutLink = document.createElement("a");
            aboutLink.className = "RedCheckOSS-info-widget__link";
            aboutLink.href = this.CONFIG.ABOUT_URL;
            aboutLink.textContent = "私について";
            aboutLink.setAttribute("aria-label", "私について");

            const policyLink = document.createElement("a");
            policyLink.className = "RedCheckOSS-info-widget__link";
            policyLink.href = this.CONFIG.POLICIES_URL;
            policyLink.textContent = "利用規約および個人情報政策";
            policyLink.setAttribute(
                "aria-label",
                "利用規約および個人情報政策"
            );

            links.appendChild(aboutLink);
            links.appendChild(policyLink);

            const widget = document.createElement("div");
            widget.className = "RedCheckOSS-info-widget";
            widget.setAttribute(
                "data-RedCheckOSS-info-widget",
                "true"
            );
            widget.setAttribute("aria-label", "サイト情報");
            widget.appendChild(toggle);
            widget.appendChild(links);

            document.head.appendChild(style);
            document.body.appendChild(widget);

            this.setupLogoDiagnostic();
            return true;
        },

        removeInfoWidget() {
            document
                .querySelectorAll(
                    '[data-RedCheckOSS-info-widget="true"]'
                )
                .forEach(widget => widget.remove());
        },

        setupLogoDiagnostic() {
            if (!document.body) {
                return;
            }

            const selector =
                '[data-RedCheckOSS-logo-diagnostic="true"]';

            if (document.querySelector(selector)) {
                return;
            }

            const attach = logoElement => {
                if (
                    !logoElement ||
                    !logoElement.classList ||
                    logoElement.getAttribute(
                        "data-RedCheckOSS-logo-diagnostic"
                    ) === "true"
                ) {
                    return !!logoElement;
                }

                logoElement.classList.add(
                    "RedCheckOSS-logo-diagnostic-trigger"
                );
                logoElement.setAttribute(
                    "data-RedCheckOSS-logo-diagnostic",
                    "true"
                );
                logoElement.setAttribute("tabindex", "0");
                logoElement.setAttribute("role", "button");
                logoElement.setAttribute(
                    "aria-label",
                    "Red Check debug"
                );
                logoElement.style.cursor = "pointer";

                let clickCount = 0;
                let resetTimer = null;

                const handlePress = () => {
                    clickCount += 1;

                    if (resetTimer !== null) {
                        window.clearTimeout(resetTimer);
                        resetTimer = null;
                    }

                    if (clickCount >= 5) {
                        clickCount = 0;
                        this.showDebugState();
                        return;
                    }

                    resetTimer = window.setTimeout(() => {
                        clickCount = 0;
                        resetTimer = null;
                    }, 1800);
                };

                logoElement.addEventListener("click", handlePress);
                logoElement.addEventListener("keydown", event => {
                    if (
                        event &&
                        (event.key === "Enter" || event.key === " ")
                    ) {
                        event.preventDefault();
                        handlePress();
                    }
                });

                return true;
            };

            const findInjectedLogo = () =>
                document.querySelector(
                    '[data-RedCheckOSS-info-widget="true"] .RedCheckOSS-info-widget__toggle'
                );

            const initialLogo = findInjectedLogo();

            if (initialLogo) {
                attach(initialLogo);
                return;
            }

            if (typeof MutationObserver !== "function") {
                return;
            }

            const observer = new MutationObserver(() => {
                const logo = findInjectedLogo();

                if (!logo) {
                    return;
                }

                if (attach(logo)) {
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        showDebugState() {
            try {
                const state = {
                    "RedFlag Checker OSS by Sentaro": "3",
                    モード:
                        this.STATE.checkMode === "none"
                            ? "check=none"
                            : "normal",
                    ソース: this.STATE.scriptSource || null,
                    UUID: this.STATE.uuid || null,
                    리용약관동의상태: this.STATE.termsState,
                    봉사중심상태: this.STATE.serverStatus,
                    現在位置: window.location.href,
                    現在リ용상태: document.readyState,
                    리용자언어: navigator.language,
                    리용자환경: navigator.userAgent,
                    時間: new Date().toISOString()
                };

                window.alert(
                    Object.entries(state)
                        .map(
                            ([key, value]) =>
                                `${key}:${value}`
                        )
                        .join("\n")
                );
            } catch (error) {
                console.error(
                    `${LOG_PREFIX} ❌ DEBUG STATE ERROR:`,
                    error
                );
            }
        },

        injectViewTransitionStyle() {
            const head =
                document.head ||
                document.documentElement;

            if (!head) {
                return false;
            }

            if (
                !document.querySelector(
                    'meta[name="view-transition"]'
                )
            ) {
                const meta = document.createElement("meta");
                meta.name = "view-transition";
                meta.content = "same-origin";
                head.appendChild(meta);
            }

            if (
                document.querySelector(
                    '[data-RedCheckOSS-style="view-transition"]'
                )
            ) {
                return true;
            }

            const style = document.createElement("style");
            style.setAttribute(
                "data-RedCheckOSS-style",
                "view-transition"
            );
            style.textContent = `
                @view-transition{navigation:auto}
                ::view-transition-old(root){
                    animation:fade-and-scale-out 0.6s cubic-bezier(.4,.04,0,1);
                }
                ::view-transition-new(root){
                    animation:fade-and-scale-in 0.6s cubic-bezier(.4,.04,0,1);
                }
                @keyframes fade-and-scale-out{
                    to{opacity:0;transform:scale(.9)}
                }
                @keyframes fade-and-scale-in{
                    from{opacity:0;transform:scale(.9)}
                }
            `;

            head.appendChild(style);
            return true;
        }
    };

    if (window.RedCheckOSS) {
        console.warn(
            `${LOG_PREFIX} ⚠️ Existing RedCheckOSS global detected; replacing it`
        );
    }

    window.RedCheckOSS = RedCheckOSS;

    const start = () => {
        try {
            RedCheckOSS.init().catch(error => {
                console.error(
                    `${LOG_PREFIX} ❌ INIT FATAL ERROR:`,
                    error
                );
            });
        } catch (error) {
            console.error(
                `${LOG_PREFIX} ❌ INIT START ERROR:`,
                error
            );
        }
    };

    const boot = () => {
        try {
            // Heavy is intentionally loaded on every boot.
            // UI/config remain entirely in check.js.
            start();
        } catch (error) {
            console.error(
                `${LOG_PREFIX} ❌ BOOT ERROR:`,
                error
            );
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            boot,
            { once: true }
        );
    } else {
        boot();
    }
})();
