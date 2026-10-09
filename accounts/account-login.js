/* Rename to account-login.js when deploying. */
(() => {
  "use strict";
  const API_BASE = "https://sentaro-0f8-accounts.takesen2278.workers.dev";
  const state = new URLSearchParams(location.search).get("state") || "";
  const requestedOrigin = new URLSearchParams(location.search).get("origin") || "";
  function log(event, details = {}) { console.log("[0f8-login]", event, details); }
  function errorLog(event, error, details = {}) { console.error("[0f8-login]", event, error instanceof Error ? error.message : String(error), details); }
  function required(id) { const el = document.getElementById(id); if (!el) { console.error(`[0f8-login] Required element not found: #${id}`); throw new Error(`Required element not found: #${id}`); } return el; }
  function validateReturnOrigin() {
    if (!requestedOrigin) throw new Error("Return origin is missing.");
    const url = new URL(requestedOrigin);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("Return origin must use HTTPS.");
    return url.origin;
  }
  function setStatus(element, message, kind = "") { if (!element) { console.error("[0f8-login] Status element is missing."); return; } element.textContent = message; element.dataset.kind = kind; }
  async function api(path, body) {
    const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), cache: "no-store", credentials: "omit" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error?.message || `Request failed (${response.status}).`);
    return data;
  }
  function sendResult(result) {
    const returnOrigin = validateReturnOrigin();
    if (!window.opener || window.opener.closed) { log("no_opener", { returnOrigin }); setTimeout(() => window.close(), 500); return; }
    const payload = { type: "OF8_AUTH_RESULT", version: 2, state, accessToken: result.token, signature: result.signature, dataAccessKey: result.dataAccessKey, account: result.account };
    try {
      window.opener.postMessage(payload, returnOrigin);
      log("auth_result_sent", { returnOrigin, id: result.account?.id });
      setTimeout(() => {
        if (!window.closed) {
          log("closing_login_popup_after_result");
          window.close();
        }
      }, 250);
    } catch (error) {
      errorLog("auth_result_send_failed", error, { returnOrigin });
      setStatus(required("login-status"), "認証結果を元のサービスへ返せませんでした。", "error");
    }
  }
  async function submit(path, form, statusElement) {
    const button = form.querySelector("button[type='submit']");
    if (!button) { console.error("[0f8-login] Submit button not found."); return; }
    button.disabled = true; setStatus(statusElement, "処理中…");
    try {
      const formData = new FormData(form);
      const body = { id: String(formData.get("id") || "").trim(), password: String(formData.get("password") || ""), origin: validateReturnOrigin() };
      if ([...body.password].length < 8) throw new Error("パスワードは8文字以上で入力してください。");
      if (path.endsWith("register")) body.name = String(formData.get("name") || "").trim();
      const result = await api(path, body);
      setStatus(statusElement, "認証に成功しました。", "success");
      log("api_success", { path, id: result.account?.id });
      sendResult(result);
    } catch (error) { errorLog("submit_failed", error, { path }); setStatus(statusElement, error instanceof Error ? error.message : "処理に失敗しました。", "error"); }
    finally { button.disabled = false; }
  }
  function initTabs() {
    const tabs = document.querySelectorAll(".account-tab");
    const loginForm = required("login-form"); const registerForm = required("register-form");
    for (const tab of tabs) {
      tab.addEventListener("click", () => { const mode = tab.dataset.mode; const login = mode === "login"; for (const item of tabs) item.setAttribute("aria-selected", String(item === tab)); loginForm.classList.toggle("account-hidden", !login); registerForm.classList.toggle("account-hidden", login); log("tab_changed", { mode }); });
    }
  }
  function init() {
    const loginForm = required("login-form"); const registerForm = required("register-form"); const loginStatus = required("login-status"); const registerStatus = required("register-status");
    validateReturnOrigin(); initTabs();
    loginForm.addEventListener("submit", (event) => { event.preventDefault(); submit("/v1/auth/login", loginForm, loginStatus); });
    registerForm.addEventListener("submit", (event) => { event.preventDefault(); submit("/v1/accounts/register", registerForm, registerStatus); });
    log("ready", { returnOrigin: requestedOrigin });
  }
  try { init(); } catch (error) { errorLog("init_failed", error); }
})();
