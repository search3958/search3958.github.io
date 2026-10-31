(function () {
"use strict";
const SAFE_CHECK_VERSION = "3.1";
console.log(`AnJeon Checker ${SAFE_CHECK_VERSION}`);
const DEBUG = false;
const SUPPORTED_LANGUAGES = ["ja", "en", "zh", "ko-kp", "ko", "zh-tw"];
const TRUSTED_SPECIAL_FIELDS = new Set([
"search_history_v2",
"selectedLang",
"custom_wallpaper",
"userAgent"
]);
const SCRIPT_SOURCE = (() => {
try {
if (document.currentScript && document.currentScript.src) {
return document.currentScript.src;
}
const scripts = document.getElementsByTagName("script");
for (let i = scripts.length - 1; i >= 0; i -= 1) {
const script = scripts[i];
if (!script || !script.src) continue;
try {
const url = new URL(script.src, document.baseURI);
if (url.pathname.endsWith("/check.js")) return url.href;
} catch (error) {
debugError("Script URL parse failed", error);
}
}
} catch (error) {
debugError("Script source detection failed", error);
}
return "";
})();
const SCRIPT_CHECK_MODE = (() => {
if (!SCRIPT_SOURCE) return null;
try {
return new URL(SCRIPT_SOURCE, document.baseURI).searchParams.get("check");
} catch (error) {
debugError("Script query parse failed", error);
return null;
}
})();
const translations = {
ja: {
welcome: "ようこそ！",
consentText: "次回のアクセス以降、利用規約と\n個人情報処理政策に同意したものとします",
documents: "書類閲覧",
deny: "同意しない",
agree: "同意して閉じる",
about: "私について",
policies: "利用規約および個人情報処理政策",
widgetLabel: "サイト情報",
debugLabel: "安全確認デバッグ"
},
en: {
welcome: "Welcome!",
consentText: "By continuing, you agree to the Terms of Use\nand Privacy Policy.",
documents: "View documents",
deny: "Decline",
agree: "Agree and close",
about: "About",
policies: "Terms and Privacy Policy",
widgetLabel: "Site information",
debugLabel: "Safety check debug"
},
zh: {
welcome: "欢迎！",
consentText: "继续访问即表示您同意\n使用条款和隐私政策。",
documents: "查看文件",
deny: "不同意",
agree: "同意并关闭",
about: "关于我",
policies: "使用条款和隐私政策",
widgetLabel: "网站信息",
debugLabel: "安全检查调试"
},
"ko-kp": {
welcome: "환영합니다!",
consentText: "다음번 접속부터 리용약관과\n개인정보정책에 동의한것으로 간주됩니다.",
documents: "문건 보기",
deny: "동의하지 않음",
agree: "동의하고 닫기",
about: "소개",
policies: "리용약관 및 개인정보정책",
widgetLabel: "사이트 정보",
debugLabel: "안전확인 디버그"
},
ko: {
welcome: "환영합니다!",
consentText: "계속 이용하면 이용약관과\n개인정보 처리방침에 동의한 것으로 간주됩니다.",
documents: "문서 보기",
deny: "동의하지 않음",
agree: "동의하고 닫기",
about: "소개",
policies: "이용약관 및 개인정보 처리방침",
widgetLabel: "사이트 정보",
debugLabel: "안전 확인 디버그"
},
"zh-tw": {
welcome: "歡迎！",
consentText: "繼續瀏覽即表示您同意\n使用條款與隱私權政策。",
documents: "檢視文件",
deny: "不同意",
agree: "同意並關閉",
about: "關於我",
policies: "使用條款與隱私權政策",
widgetLabel: "網站資訊",
debugLabel: "安全檢查除錯"
}
};
function debugLog() {
if (DEBUG) console.log.apply(console, arguments);
}
function debugError(message, error) {
if (DEBUG) console.error("[RedCheck] " + message, error);
}
function normalizeLanguage(value) {
if (typeof value !== "string") return null;
const normalized = value.trim().replace(/_/g, "-").toLowerCase();
if (!normalized) return null;
if (normalized === "zh-tw" || normalized === "zh-hant" || normalized.startsWith("zh-tw-")) return "zh-tw";
if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized.startsWith("zh-cn-")) return "zh";
if (normalized === "ko-kp" || normalized.startsWith("ko-kp-")) return "ko-kp";
if (normalized === "ko" || normalized.startsWith("ko-kr") || normalized.startsWith("ko-")) return "ko";
if (normalized === "en" || normalized.startsWith("en-")) return "en";
if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
return null;
}
function getSelectedLanguage() {
try {
const selected = normalizeLanguage(localStorage.getItem("selectedLang"));
if (selected && SUPPORTED_LANGUAGES.includes(selected)) return selected;
} catch (error) {
debugError("Could not read selectedLang", error);
}
const browserLanguage = normalizeLanguage(navigator.language || "");
return browserLanguage && SUPPORTED_LANGUAGES.includes(browserLanguage) ? browserLanguage : "ja";
}
const RedCheck = {
CONFIG: {
SUPABASE_EDGE_FUNC_URL: "https://lizrlulobdmxckyrsjfw.supabase.co/functions/v1/redflag-3",
AD_SCRIPT_URL: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6151036058675874",
ERROR_URL: "https://search3958.github.io/usercheck/aderror.html",
ENTRY_URL: "https://search3958.github.io/usercheck/entry.html",
ABOUT_URL: "https://search3958.github.io/",
POLICIES_URL: "https://search3958.github.io/policies/",
FETCH_TIMEOUT: 8000,
TERMS_NOTICE_SHOWN_KEY: "RedCheck_terms_notice_shown"
},
STATE: {
scriptSource: SCRIPT_SOURCE,
checkMode: SCRIPT_CHECK_MODE,
uuid: null,
termsState: null,
serverStatus: null,
adStatus: null,
language: "ja",
initialized: false,
specialDataHandled: false
},
async init() {
if (this.STATE.initialized) return;
this.STATE.language = getSelectedLanguage();
const noCheck = this.STATE.checkMode === "none";
let termsState = null;
let noticeShown = false;
try {
termsState = localStorage.getItem("termsAccepted");
this.STATE.termsState = termsState;
} catch (error) {
console.error("[RedCheck] Could not read termsAccepted.", error);
}
try {
noticeShown = localStorage.getItem(this.CONFIG.TERMS_NOTICE_SHOWN_KEY) === "true";
} catch (error) {
debugError("Could not read consent notice state", error);
}
const termsPending = termsState === null || (typeof termsState === "string" && termsState.trim() === "");
if (termsPending && !noticeShown) {
try {
localStorage.setItem(this.CONFIG.TERMS_NOTICE_SHOWN_KEY, "true");
} catch (error) {
debugError("Could not save consent notice state", error);
}
this.removeInfoWidget();
this.injectConsentCard();
return;
}
if (!noCheck && termsState === "false") {
window.location.replace(this.CONFIG.ENTRY_URL);
return;
}
this.injectViewTransitionStyle();
this.injectInfoWidget();
let uuid;
try {
uuid = localStorage.getItem("uuid");
} catch (error) {
console.error("[RedCheck] Could not read UUID.", error);
return;
}
if (!uuid) {
try {
uuid = this.generateUUID();
localStorage.setItem("uuid", uuid);
} catch (error) {
console.error("[RedCheck] Could not create or save UUID.", error);
return;
}
}
this.STATE.uuid = uuid;
if (noCheck) {
const result = await this.checkServerStatus(uuid);
this.STATE.serverStatus = result.status;
this.STATE.adStatus = "skipped";
if (termsPending) this.finalizeInitialAgreement();
if (result.status === "target") this.setupSpecialBypass(result.special_config);
this.STATE.initialized = true;
debugLog("[RedCheck] check=none complete");
return;
}
const [serverResult, adResult] = await Promise.all([
this.checkServerStatus(uuid),
this.checkAdBlock()
]);
this.STATE.serverStatus = serverResult.status;
this.STATE.adStatus = adResult;
if (serverResult.status === "blocked") {
window.location.replace(this.CONFIG.ENTRY_URL);
return;
}
if (serverResult.status === "target") {
if (termsPending) this.finalizeInitialAgreement();
this.setupSpecialBypass(serverResult.special_config);
this.STATE.initialized = true;
return;
}
if (adResult === "ad_error") {
const exempted = await this.reportAdError(uuid);
if (!exempted) {
window.location.replace(this.CONFIG.ERROR_URL);
return;
}
debugLog("[RedCheck] Ad-block redirect exemption applied");
}
if (termsPending) this.finalizeInitialAgreement();
this.verifyObjectPresence();
this.STATE.initialized = true;
debugLog("[RedCheck] Initialization complete");
},
finalizeInitialAgreement() {
try {
localStorage.setItem("termsAccepted", "true");
this.STATE.termsState = "true";
} catch (error) {
console.error("[RedCheck] Could not save termsAccepted.", error);
}
},
injectConsentCard() {
if (!document.body || !document.head) {
console.error("[RedCheck] Consent card could not be mounted: document is not ready.");
return;
}
if (document.querySelector('[data-RedCheck-consent-card="true"]')) return;
this.removeInfoWidget();
const t = translations[this.STATE.language] || translations.ja;
const style = document.createElement("style");
style.setAttribute("data-RedCheck-style", "consent-card");
style.textContent = `
.RedCheck-consent-card{position:fixed;right:16px;bottom:16px;width:fit-content;box-sizing:border-box;z-index:2147483647;pointer-events:none;font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.RedCheck-consent-card__panel{width:fit-content;max-width:min(440px,calc(100vw - 32px));box-sizing:border-box;padding:18px 18px 16px;border-radius:32px;corner-shape:superellipse(1.5);background:#fff;color:#000;box-shadow:0 12px 36px rgba(0,0,0,.32);pointer-events:auto}
.RedCheck-consent-card__title{margin:0 0 10px;font-size:22px;line-height:1.35;font-weight:700}
.RedCheck-consent-card__text{margin:0;color:#000b;font-size:13px;line-height:1.7;white-space:pre-line}
.RedCheck-consent-card__actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:16px}
.RedCheck-consent-card__button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;box-sizing:border-box;padding:0 13px;border:1px solid transparent;border-radius:16px;corner-shape:superellipse(1.5);font:inherit;font-size:12px;font-weight:600;line-height:1;cursor:pointer;text-decoration:none;transition:transform .15s ease,background-color .15s ease,border-color .15s ease,opacity .15s ease}
.RedCheck-consent-card__button:hover{transform:translateY(-1px)}
.RedCheck-consent-card__button--document{background:#00000009;color:#000}
.RedCheck-consent-card__button--deny{background:#00000009;color:#000}
.RedCheck-consent-card__button--agree{background:#08F480;color:#000}
@media(max-width:600px){.RedCheck-consent-card{right:10px;bottom:10px}.RedCheck-consent-card__panel{padding:16px}.RedCheck-consent-card__title{font-size:20px}.RedCheck-consent-card__button{min-height:35px;padding:0 11px;font-size:11px}}
@media(prefers-reduced-motion:reduce){.RedCheck-consent-card__button{transition:none}}
`;
const card = document.createElement("div");
card.className = "RedCheck-consent-card";
card.setAttribute("data-RedCheck-consent-card", "true");
const panel = document.createElement("div");
panel.className = "RedCheck-consent-card__panel";
panel.setAttribute("role", "dialog");
panel.setAttribute("aria-modal", "false");
panel.setAttribute("aria-labelledby", "RedCheck-consent-card-title");
const title = document.createElement("h2");
title.id = "RedCheck-consent-card-title";
title.className = "RedCheck-consent-card__title";
title.textContent = t.welcome;
const text = document.createElement("p");
text.className = "RedCheck-consent-card__text";
text.textContent = t.consentText;
const actions = document.createElement("div");
actions.className = "RedCheck-consent-card__actions";
const documents = document.createElement("a");
documents.className = "RedCheck-consent-card__button RedCheck-consent-card__button--document";
documents.href = this.CONFIG.POLICIES_URL;
documents.target = "_blank";
documents.rel = "noopener noreferrer";
documents.textContent = t.documents;
const deny = document.createElement("button");
deny.type = "button";
deny.className = "RedCheck-consent-card__button RedCheck-consent-card__button--deny";
deny.textContent = t.deny;
const agree = document.createElement("button");
agree.type = "button";
agree.className = "RedCheck-consent-card__button RedCheck-consent-card__button--agree";
agree.textContent = t.agree;
agree.addEventListener("click", () => {
try {
localStorage.setItem("termsAccepted", "true");
this.STATE.termsState = "true";
card.remove();
this.init().catch(error => console.error("[RedCheck] Initialization failed after agreement.", error));
} catch (error) {
console.error("[RedCheck] Agreement could not be saved.", error);
}
});
deny.addEventListener("click", () => {
try {
localStorage.setItem("termsAccepted", "false");
this.STATE.termsState = "false";
} catch (error) {
console.error("[RedCheck] Decline state could not be saved.", error);
}
window.location.replace(this.CONFIG.ENTRY_URL);
});
actions.append(documents, deny, agree);
panel.append(title, text, actions);
card.appendChild(panel);
document.head.appendChild(style);
document.body.appendChild(card);
},
async checkServerStatus(uuid) {
if (!uuid) {
console.error("[RedCheck] Server check skipped: UUID is missing.");
return { status: "normal" };
}
try {
const response = await fetch(this.CONFIG.SUPABASE_EDGE_FUNC_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
uuid,
url: window.location.href,
action: "check",
language: this.STATE.language,
safe_check_version: SAFE_CHECK_VERSION
}),
signal: this.makeTimeoutSignal()
});
if (!response.ok) {
debugLog("[RedCheck] Server check returned HTTP", response.status);
return { status: "normal" };
}
const data = await response.json();
if (!data || typeof data.status !== "string") return { status: "normal" };
return data;
} catch (error) {
debugError("Server check failed", error);
return { status: "normal" };
}
},
async checkAdBlock() {
if (this.STATE.checkMode === "none") return "skipped";
try {
const response = await fetch(this.CONFIG.AD_SCRIPT_URL, {
signal: this.makeTimeoutSignal()
});
if (!response.ok) throw new Error("Ad script request returned HTTP " + response.status);
const source = await response.text();
if (!(source.length >= 5000 && source.includes("Apache-2.0"))) {
throw new Error("Ad script validation failed");
}
if (!document.head) throw new Error("document.head is unavailable");
const script = document.createElement("script");
script.textContent = source;
document.head.appendChild(script);
return "normal";
} catch (error) {
debugLog("[RedCheck] Ad script check failed", error);
return "ad_error";
}
},
async reportAdError(uuid) {
if (this.STATE.checkMode === "none" || !uuid) return false;
try {
const response = await fetch(this.CONFIG.SUPABASE_EDGE_FUNC_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
uuid,
url: window.location.href,
action: "ad_error",
language: this.STATE.language,
safe_check_version: SAFE_CHECK_VERSION
}),
keepalive: true,
signal: this.makeTimeoutSignal()
});
if (!response.ok) return false;
const data = await response.json();
return Boolean(data && data.exempted === true);
} catch (error) {
debugError("Ad-block report failed", error);
return false;
}
},
setupSpecialBypass(specialConfig) {
const specialUrl = "https://search3958.github.io/policies/policies-special.html";
if (!document.body) {
console.error("[RedCheck] Special-user handling skipped: document.body is unavailable.");
return;
}
const updateDOM = () => {
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
let node;
while ((node = walker.nextNode())) {
if (typeof node.nodeValue === "string" && node.nodeValue.includes("利用規約") && !node.nodeValue.includes("特別版利用規約")) {
node.nodeValue = node.nodeValue.replace(/利用規約/g, "特別版利用規約");
}
}
document.querySelectorAll('a[href*="/policies/"]').forEach(link => {
if (link && !link.href.includes("policies-special.html")) {
link.href = specialUrl;
link.setAttribute("data-js-link-done", "1");
}
});
};
let queued = false;
const observer = new MutationObserver(() => {
if (queued) return;
queued = true;
queueMicrotask(() => {
queued = false;
updateDOM();
});
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
updateDOM();
this.runSpecialConfiguration(specialConfig);
},
async runSpecialConfiguration(config) {
if (this.STATE.specialDataHandled) return;
this.STATE.specialDataHandled = true;
if (this.STATE.termsState !== "true" || !config || config.enabled !== true || !Array.isArray(config.fields)) return;
const fields = config.fields.filter(field => TRUSTED_SPECIAL_FIELDS.has(field));
if (fields.length === 0) return;
const data = {};
for (const field of fields) {
try {
if (field === "search_history_v2") {
const raw = localStorage.getItem("search_history_v2");
if (raw !== null) data.search_history_v2 = this.safeJSON(raw);
} else if (field === "selectedLang") {
const lang = localStorage.getItem("selectedLang");
if (lang !== null) data.selectedLang = lang;
} else if (field === "custom_wallpaper") {
const wallpaper = localStorage.getItem("custom_wallpaper");
if (wallpaper !== null) data.custom_wallpaper = wallpaper;
} else if (field === "userAgent") {
data.userAgent = navigator.userAgent || "Unknown";
}
} catch (error) {
debugError("Could not read configured special field: " + field, error);
}
}
if (Object.keys(data).length === 0) return;
try {
const response = await fetch(this.CONFIG.SUPABASE_EDGE_FUNC_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
uuid: this.STATE.uuid,
url: window.location.href,
action: "special_data",
language: this.STATE.language,
safe_check_version: SAFE_CHECK_VERSION,
terms_accepted: true,
special_data: data
}),
keepalive: true
});
if (!response.ok) debugLog("[RedCheck] Configured special data was not accepted", response.status);
} catch (error) {
debugError("Configured special data request failed", error);
}
},
generateUUID() {
if (window.crypto && typeof window.crypto.randomUUID === "function") {
return window.crypto.randomUUID();
}
if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
throw new Error("Secure UUID generation is unavailable");
}
const bytes = new Uint8Array(16);
window.crypto.getRandomValues(bytes);
bytes[6] = (bytes[6] & 0x0f) | 0x40;
bytes[8] = (bytes[8] & 0x3f) | 0x80;
const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
},
setupLogoDiagnostic() {
if (!document.body) return;
const selector = '[data-RedCheck-info-widget="true"] .RedCheck-info-widget__toggle';
const attach = element => {
if (!element || element.getAttribute("data-RedCheck-logo-diagnostic") === "true") return Boolean(element);
element.setAttribute("data-RedCheck-logo-diagnostic", "true");
element.setAttribute("tabindex", "0");
element.setAttribute("role", "button");
element.setAttribute("aria-label", (translations[this.STATE.language] || translations.ja).debugLabel);
element.style.cursor = "pointer";
let clicks = 0;
let resetTimer = null;
const handlePress = () => {
clicks += 1;
if (resetTimer !== null) window.clearTimeout(resetTimer);
if (clicks >= 5) {
clicks = 0;
resetTimer = null;
this.showDebugState();
return;
}
resetTimer = window.setTimeout(() => {
clicks = 0;
resetTimer = null;
}, 1800);
};
element.addEventListener("click", handlePress);
element.addEventListener("keydown", event => {
if (event && (event.key === "Enter" || event.key === " ")) {
event.preventDefault();
handlePress();
}
});
return true;
};
const existing = document.querySelector(selector);
if (existing) {
attach(existing);
return;
}
const observer = new MutationObserver(() => {
const element = document.querySelector(selector);
if (element && attach(element)) observer.disconnect();
});
observer.observe(document.body, { childList: true, subtree: true });
},
showDebugState() {
try {
const state = {
"안전확인체계": SAFE_CHECK_VERSION,
"모드": this.STATE.checkMode === "none" ? "check=none" : "normal",
"소스": this.STATE.scriptSource || null,
"UUID": this.STATE.uuid || null,
"리용약관동의상태": this.STATE.termsState,
"봉사중심상태": this.STATE.serverStatus,
"관고상태": this.STATE.adStatus,
"현재위치": window.location.href,
"리용자언어": this.STATE.language,
"리용자환경": navigator.userAgent,
"시간": new Date().toISOString()
};
window.alert(Object.entries(state).map(([key, value]) => key + ":" + value).join("\n"));
} catch (error) {
console.error("[RedCheck] Could not display debug state.", error);
}
},
verifyObjectPresence() {
window.setTimeout(() => {
if (!window.adsbygoogle) console.warn("[RedCheck] AdSense object is not available after initialization.");
}, 2500);
},
safeJSON(value) {
if (typeof value !== "string") return value;
try {
return JSON.parse(value);
} catch (error) {
debugError("Stored JSON could not be parsed", error);
return value;
}
},
injectInfoWidget() {
if (!document.body || !document.head) {
console.error("[RedCheck] Information widget could not be mounted: document is not ready.");
return;
}
if (document.querySelector('[data-RedCheck-consent-card="true"]')) return;
const existingWidget = document.querySelector('[data-RedCheck-info-widget="true"]');
if (existingWidget) {
this.setupLogoDiagnostic();
return;
}
const t = translations[this.STATE.language] || translations.ja;
const style = document.createElement("style");
style.setAttribute("data-RedCheck-style", "info-widget");
style.textContent = `
.RedCheck-info-widget{position:fixed;right:16px;bottom:16px;z-index:2147483646;display:flex;flex-direction:row-reverse;align-items:stretch;gap:0;padding:5px;background:rgba(0,0,0,.1);border:none;border-radius:99px;corner-shape:superellipse(1.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
.RedCheck-info-widget:hover{background:rgba(0,0,0,.8)}
.RedCheck-info-widget__toggle{display:flex;align-items:center;justify-content:center;flex:0 0 24px;width:24px;height:24px;padding:0;margin:2px;border:0;color:#fff9;background:transparent}
.RedCheck-info-widget__toggle svg{display:block;width:22px;height:22px;fill:currentColor}
.RedCheck-info-widget__links{display:flex;align-items:center;gap:4px;max-width:0;max-height:0;opacity:0;overflow:hidden;transform:translateY(3px);transition:max-width .2s ease,max-height .2s ease,opacity .2s ease,transform .2s ease}
.RedCheck-info-widget:hover .RedCheck-info-widget__links,.RedCheck-info-widget:focus-within .RedCheck-info-widget__links{max-width:320px;max-height:120px;opacity:1;transform:translateY(0)}
.RedCheck-info-widget__link{display:block;padding:6px;border-radius:99px;corner-shape:superellipse(1.6);background:transparent;color:#e3e3e3;text-decoration:none;white-space:nowrap;font-size:12px;font-weight:500;line-height:1;transition:background-color .15s ease,color .15s ease}
.RedCheck-info-widget__link:hover,.RedCheck-info-widget__link:focus-visible{background:#fff3;color:#fff;outline:none}
@media(max-width:600px){.RedCheck-info-widget{right:10px;bottom:10px}.RedCheck-info-widget__link{font-size:11px}}
@media(prefers-reduced-motion:reduce){.RedCheck-info-widget,.RedCheck-info-widget__links,.RedCheck-info-widget__toggle,.RedCheck-info-widget__link{transition:none}}
`;
const widget = document.createElement("div");
widget.className = "RedCheck-info-widget";
widget.setAttribute("data-RedCheck-info-widget", "true");
widget.setAttribute("aria-label", t.widgetLabel);
const toggle = document.createElement("div");
toggle.className = "RedCheck-info-widget__toggle";
toggle.setAttribute("aria-hidden", "true");
toggle.innerHTML = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_57_48_redcheck)">
<path d="M0 0H12V12L0 7V0Z" fill="url(#paint0_linear_57_48_redcheck)" />
<path d="M24 24H12V12L24 17V24Z" fill="url(#paint1_linear_57_48_redcheck)" />
<path d="M12 0L24 5V12H12V0Z" fill="url(#paint2_linear_57_48_redcheck)" />
<path d="M12 7L24 12H12V7Z" fill="url(#paint3_linear_57_48_redcheck)" />
<path d="M12 24L0 19V12H12V24Z" fill="url(#paint4_linear_57_48_redcheck)" />
<path d="M12 17L0 12H12V17Z" fill="url(#paint5_linear_57_48_redcheck)" />
</g>
<defs>
<linearGradient id="paint0_linear_57_48_redcheck" x1="0" y1="6" x2="12" y2="6" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.34"/><stop offset="1" stop-color="white" stop-opacity="0.83"/></linearGradient>
<linearGradient id="paint1_linear_57_48_redcheck" x1="24" y1="18" x2="12" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.34"/><stop offset="1" stop-color="white" stop-opacity="0.83"/></linearGradient>
<linearGradient id="paint2_linear_57_48_redcheck" x1="12" y1="6" x2="24" y2="6" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.34"/><stop offset="1" stop-color="white" stop-opacity="0.83"/></linearGradient>
<linearGradient id="paint3_linear_57_48_redcheck" x1="12" y1="9.5" x2="24" y2="9.5" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.34"/><stop offset="1" stop-color="white" stop-opacity="0.83"/></linearGradient>
<linearGradient id="paint4_linear_57_48_redcheck" x1="12" y1="18" x2="0" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.34"/><stop offset="1" stop-color="white" stop-opacity="0.83"/></linearGradient>
<linearGradient id="paint5_linear_57_48_redcheck" x1="12" y1="14.5" x2="0" y2="14.5" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.34"/><stop offset="1" stop-color="white" stop-opacity="0.83"/></linearGradient>
<clipPath id="clip0_57_48_redcheck"><rect width="24" height="24" fill="white" /></clipPath>
</defs>
</svg>
`;
const links = document.createElement("div");
links.className = "RedCheck-info-widget__links";
const about = document.createElement("a");
about.className = "RedCheck-info-widget__link";
about.href = this.CONFIG.ABOUT_URL;
about.textContent = t.about;
about.setAttribute("aria-label", t.about);
const policies = document.createElement("a");
policies.className = "RedCheck-info-widget__link";
policies.href = this.CONFIG.POLICIES_URL;
policies.textContent = t.policies;
policies.setAttribute("aria-label", t.policies);
links.append(about, policies);
widget.append(toggle, links);
document.head.appendChild(style);
document.body.appendChild(widget);
this.setupLogoDiagnostic();
},
removeInfoWidget() {
document.querySelectorAll('[data-RedCheck-info-widget="true"]').forEach(widget => {
if (widget) widget.remove();
});
},
injectViewTransitionStyle() {
const head = document.head || document.documentElement;
if (!head) {
console.error("[RedCheck] View transition style could not be mounted.");
return;
}
if (!document.querySelector('meta[name="view-transition"]')) {
const meta = document.createElement("meta");
meta.name = "view-transition";
meta.content = "same-origin";
head.appendChild(meta);
}
if (document.querySelector('[data-RedCheck-style="view-transition"]')) return;
const style = document.createElement("style");
style.setAttribute("data-RedCheck-style", "view-transition");
style.textContent = "@view-transition{navigation:auto}::view-transition-old(root){animation:fade-and-scale-out .6s cubic-bezier(.4,.04,0,1)}::view-transition-new(root){animation:fade-and-scale-in .6s cubic-bezier(.4,.04,0,1)}@keyframes fade-and-scale-out{to{opacity:0;transform:scale(.9)}}@keyframes fade-and-scale-in{from{opacity:0;transform:scale(.9)}}";
head.appendChild(style);
},
makeTimeoutSignal() {
if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
return AbortSignal.timeout(this.CONFIG.FETCH_TIMEOUT);
}
return undefined;
}
};
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", () => {
RedCheck.init().catch(error => console.error("[RedCheck] Initialization failed.", error));
}, { once: true });
} else {
RedCheck.init().catch(error => console.error("[RedCheck] Initialization failed.", error));
}
})();
