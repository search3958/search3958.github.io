/* 0F8 Account Client Service v2
 * Rename this file to client-service.js when deploying.
 */
(() => {
  "use strict";

  const OF8_CLIENT_CONFIG = Object.freeze({
    apiBase: "https://sentaro-0f8-accounts.takesen2278.workers.dev",
    popupUrl: "https://search3958.github.io/support/accounts/account-login.html",
    cookieToken: "__Host-of8_access_token",
    cookieSignature: "__Host-of8_access_signature",
    legacyCookieToken: "of8_access_token",
    legacyCookieSignature: "of8_access_signature",
    storageKey: "__of8_data_access_key_v2__",
    storageDataKey: "__of8_data_cache_v2__",
    popupWidth: 460,
    popupHeight: 720,
  });

  const td = new TextDecoder();

  function clientLog(event, details = {}) {
    console.log("[0f8-client]", event, details);
  }

  function clientError(event, error, details = {}) {
    console.error("[0f8-client]", event, error instanceof Error ? error.message : String(error), details);
  }

  function getOrigin() {
    const origin = location.origin.toLowerCase();
    if (!/^https:\/\//.test(origin) && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error("0F8 requires an HTTPS origin.");
    }
    return origin;
  }

  function base64UrlBytes(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]*$/.test(value)) throw new Error("Invalid access-key encoding.");
    const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
    let binary;
    try {
      binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      throw new Error("Invalid access-key encoding.");
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length !== 32) throw new Error("Invalid data access key length.");
    return bytes;
  }

  function getCookie(name) {
    const prefix = `${encodeURIComponent(name)}=`;
    const item = document.cookie.split(";").find((entry) => entry.trim().startsWith(prefix));
    if (!item) return "";
    try { return decodeURIComponent(item.trim().slice(prefix.length)); }
    catch (error) { clientError("cookie_decode_failed", error, { name }); return ""; }
  }

  function getSessionCookie(name, legacyName) {
    return getCookie(name) || getCookie(legacyName);
  }

  function setCookie(name, value, maxAgeSeconds = 259200) {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; Secure; SameSite=Strict`;
    clientLog("cookie_saved", { name });
  }

  function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; Secure; SameSite=Strict`;
    clientLog("cookie_deleted", { name });
  }

  function saveAccessKey(value) {
    base64UrlBytes(value);
    localStorage.setItem(OF8_CLIENT_CONFIG.storageKey, value);
    clientLog("data_access_key_saved");
  }

  function getAccessKey() {
    const value = localStorage.getItem(OF8_CLIENT_CONFIG.storageKey) || "";
    if (!value) throw new Error("データアクセスキーがありません。もう一度ログインしてください。");
    base64UrlBytes(value);
    return value;
  }

  function clearLocalSession() {
    deleteCookie(OF8_CLIENT_CONFIG.cookieToken);
    deleteCookie(OF8_CLIENT_CONFIG.cookieSignature);
    deleteCookie(OF8_CLIENT_CONFIG.legacyCookieToken);
    deleteCookie(OF8_CLIENT_CONFIG.legacyCookieSignature);
    localStorage.removeItem(OF8_CLIENT_CONFIG.storageKey);
    localStorage.removeItem(`${OF8_CLIENT_CONFIG.storageDataKey}:${getOrigin()}`);
    clientLog("local_session_cleared");
  }

  function decodeTokenId(token) {
    const parts = String(token).split(".");
    if (parts.length !== 6 || parts[0] !== "v1") throw new Error("Invalid access token.");
    const padded = parts[3] + "=".repeat((4 - (parts[3].length % 4)) % 4);
    return td.decode(base64UrlBytesForToken(padded));
  }

  function base64UrlBytesForToken(value) {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function createLoginState() {
    const stateBytes = crypto.getRandomValues(new Uint8Array(24));
    let binary = "";
    for (let i = 0; i < stateBytes.length; i++) binary += String.fromCharCode(stateBytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function buildLoginUrl(state) {
    const origin = getOrigin();
    const url = new URL(OF8_CLIENT_CONFIG.popupUrl);
    url.searchParams.set("origin", origin);
    url.searchParams.set("state", state);
    if (url.origin === origin) {
      console.error("[0f8-client] login_popup_invalid_origin", { popupOrigin: url.origin, origin });
      throw new Error("ログイン画面の配信元がアカウントサービスと一致していません。");
    }
    return url;
  }

  function openPopup() {
    const state = createLoginState();
    const url = buildLoginUrl(state);
    const origin = getOrigin();
    sessionStorage.setItem("__of8_login_state_v2__", state);
    const left = Math.max(0, Math.round((screen.width - OF8_CLIENT_CONFIG.popupWidth) / 2));
    const top = Math.max(0, Math.round((screen.height - OF8_CLIENT_CONFIG.popupHeight) / 2));
    const features = `popup=yes,width=${OF8_CLIENT_CONFIG.popupWidth},height=${OF8_CLIENT_CONFIG.popupHeight},left=${left},top=${top}`;
    const windowName = `of8-account-login-${state}`;

    // 先に同一オリジンの空ウィンドウを作り、受信監視を開始してから0F8ログイン画面へ遷移させます。
    // これにより非常に高速なポップアップ表示でもpostMessageの受信準備が遅れる競合を避けます。
    const popup = window.open("about:blank", windowName, features);
    if (!popup) {
      sessionStorage.removeItem("__of8_login_state_v2__");
      console.error("[0f8-client] login_popup_blocked");
      throw new Error("Login popup was blocked by the browser.");
    }

    clientLog("login_popup_opened", { origin, popupOrigin: url.origin });
    return { popup, state, url };
  }

  function waitForAuthResult(popup, state) {
    return new Promise((resolve, reject) => {
      const expectedOrigin = new URL(OF8_CLIENT_CONFIG.popupUrl).origin;
      if (!popup || typeof popup.closed !== "boolean") {
        reject(new Error("Login popup handle is invalid."));
        return;
      }

      let settled = false;
      let closeTimer = null;
      let timeout = null;

      function cleanup(removeState = true) {
        if (closeTimer !== null) window.clearInterval(closeTimer);
        if (timeout !== null) window.clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        if (removeState) sessionStorage.removeItem("__of8_login_state_v2__");
      }

      function fail(message, details = {}) {
        if (settled) return;
        settled = true;
        cleanup();
        clientError("login_popup_failed", new Error(message), details);
        reject(new Error(message));
      }

      function succeed(message) {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          popup.close();
          clientLog("login_popup_closed_after_result");
        } catch (error) {
          clientError("login_popup_close_failed", error);
        }
        setCookie(OF8_CLIENT_CONFIG.cookieToken, message.accessToken);
        setCookie(OF8_CLIENT_CONFIG.cookieSignature, message.signature);
        saveAccessKey(message.dataAccessKey);
        const savedToken = getSessionCookie(OF8_CLIENT_CONFIG.cookieToken, OF8_CLIENT_CONFIG.legacyCookieToken);
        const savedSignature = getSessionCookie(OF8_CLIENT_CONFIG.cookieSignature, OF8_CLIENT_CONFIG.legacyCookieSignature);
        if (savedToken !== message.accessToken || savedSignature !== message.signature) {
          console.error("[0f8-client] login_cookie_persist_failed", {
            tokenSaved: Boolean(savedToken),
            signatureSaved: Boolean(savedSignature),
          });
          reject(new Error("認証情報をこのサービスに保存できませんでした。Cookie設定を確認してください。"));
          return;
        }
        clientLog("login_completed", { id: decodeTokenId(message.accessToken), cookieSaved: true });
        resolve({ accessToken: message.accessToken, signature: message.signature, account: message.account });
      }

      function onMessage(event) {
        if (event.origin !== expectedOrigin || event.source !== popup) return;
        const message = event.data;
        if (!message || message.type !== "OF8_AUTH_RESULT" || message.version !== 2) return;
        if (message.state !== state) return;
        if (typeof message.accessToken !== "string" || typeof message.signature !== "string" || typeof message.dataAccessKey !== "string") {
          fail("Authentication response is malformed.");
          return;
        }
        try {
          base64UrlBytes(message.dataAccessKey);
          decodeTokenId(message.accessToken);
        } catch (error) {
          fail(error instanceof Error ? error.message : "認証結果が不正です。");
          return;
        }
        clientLog("auth_result_received", { origin: event.origin });
        succeed(message);
      }

      window.addEventListener("message", onMessage);

      closeTimer = window.setInterval(() => {
        if (!popup.closed) return;
        fail("ログイン画面が閉じられました。", { popupClosed: true });
      }, 100);

      timeout = window.setTimeout(() => {
        try { popup.close(); } catch (error) { clientError("login_popup_close_failed", error); }
        fail("ログインウィンドウがタイムアウトしました。", { timeout: true });
      }, 5 * 60 * 1000);

      clientLog("login_popup_monitoring_started");
    });
  }

  async function request(path, options = {}) {
    const method = options.method || "GET";
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    const token = getSessionCookie(OF8_CLIENT_CONFIG.cookieToken, OF8_CLIENT_CONFIG.legacyCookieToken);
    const signature = getSessionCookie(OF8_CLIENT_CONFIG.cookieSignature, OF8_CLIENT_CONFIG.legacyCookieSignature);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (signature) headers.set("X-OF8-Signature", signature);
    if (options.dataAccess === true) headers.set("X-OF8-Data-Access-Key", getAccessKey());
    const response = await fetch(`${OF8_CLIENT_CONFIG.apiBase}${path}`, {
      method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), cache: "no-store", credentials: "omit",
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (error) { clientError("response_parse_failed", error, { path, status: response.status }); throw new Error(`Account service returned invalid JSON (${response.status}).`); }
    if (!response.ok || data.ok === false) {
      const message = data?.error?.message || `Account service error (${response.status}).`;
      clientError("request_failed", new Error(message), { path, status: response.status, code: data?.error?.code });
      throw new Error(message);
    }
    if (data.token && data.signature) {
      setCookie(OF8_CLIENT_CONFIG.cookieToken, data.token);
      setCookie(OF8_CLIENT_CONFIG.cookieSignature, data.signature);
      clientLog("token_rotated", { path });
    }
    return data;
  }

  function domainDataCacheKey() { return `${OF8_CLIENT_CONFIG.storageDataKey}:${getOrigin()}`; }

  function readCache() {
    const raw = localStorage.getItem(domainDataCacheKey());
    if (!raw) return { v: 1, items: {} };
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.v === 1 && parsed.items && typeof parsed.items === "object" && !Array.isArray(parsed.items)) return parsed;
    } catch (error) { clientError("cache_parse_failed", error); }
    return { v: 1, items: {} };
  }

  function writeCache(data) { localStorage.setItem(domainDataCacheKey(), JSON.stringify(data)); }

  async function syncFromServer() {
    const result = await request("/v1/data", { dataAccess: true });
    const data = result.data && result.data.v === 1 ? result.data : { v: 1, items: {} };
    writeCache(data);
    clientLog("server_data_synced", { keys: Object.keys(data.items).length, empty: result.empty === true });
    return data;
  }

  async function saveWholeObject(next) {
    if (!next || next.v !== 1 || !next.items || typeof next.items !== "object" || Array.isArray(next.items)) throw new Error("Invalid client data object.");
    const confirmed = await request("/v1/data", { method: "PUT", body: { data: next }, dataAccess: true });
    const data = confirmed.data && confirmed.data.v === 1 ? confirmed.data : next;
    writeCache(data);
    clientLog("data_saved_and_confirmed", { keys: Object.keys(data.items).length });
    return data;
  }

  async function login() {
    const { popup, state, url } = openPopup();
    const resultPromise = waitForAuthResult(popup, state);
    try {
      // message監視を先に登録してから配信元へ遷移します。
      popup.location.replace(url.toString());
      clientLog("login_popup_navigated", { popupOrigin: url.origin });
    } catch (error) {
      try { popup.close(); } catch (closeError) { clientError("login_popup_close_failed", closeError); }
      sessionStorage.removeItem("__of8_login_state_v2__");
      clientError("login_popup_navigation_failed", error, { url: url.toString() });
      throw new Error("ログイン画面を開けませんでした。");
    }
    return resultPromise;
  }

  async function logout() {
    const token = getCookie(OF8_CLIENT_CONFIG.cookieToken);
    if (token) {
      try { await request("/v1/auth/logout", { method: "POST", body: {} }); }
      catch (error) { clientError("logout_request_failed", error); }
    }
    clearLocalSession();
    clientLog("logout_completed");
  }

  async function getItem(key) {
    const data = await syncFromServer();
    const normalizedKey = String(key);
    return Object.prototype.hasOwnProperty.call(data.items, normalizedKey) ? data.items[normalizedKey] : null;
  }

  async function setItem(key, value) {
    const data = await syncFromServer();
    data.items[String(key)] = String(value);
    return saveWholeObject(data);
  }

  async function removeItem(key) {
    const data = await syncFromServer();
    const normalizedKey = String(key);
    const existed = Object.prototype.hasOwnProperty.call(data.items, normalizedKey);
    delete data.items[normalizedKey];
    await saveWholeObject(data);
    clientLog("item_removed", { key: normalizedKey, existed });
  }

  async function clear() {
    const result = await request("/v1/data", { method: "DELETE", dataAccess: true });
    localStorage.removeItem(domainDataCacheKey());
    clientLog("current_domain_data_deleted", { deleted: result.deleted === true });
    return { v: 1, items: {} };
  }

  async function deleteDomainData() { return clear(); }
  async function keys() { return Object.keys(await syncFromServer().then((data) => data.items)); }
  async function length() { return (await keys()).length; }
  async function key(index) { return (await keys())[index] ?? null; }

  async function accountInfo() { return request("/v1/account/info"); }
  async function getAccountInfo() { return accountInfo(); }
  async function usage() { return request("/v1/account/usage"); }
  async function getUsage() { return usage(); }

  async function isLoggedIn() {
    const token = getSessionCookie(OF8_CLIENT_CONFIG.cookieToken, OF8_CLIENT_CONFIG.legacyCookieToken);
    const signature = getSessionCookie(OF8_CLIENT_CONFIG.cookieSignature, OF8_CLIENT_CONFIG.legacyCookieSignature);
    if (!token || !signature) return false;
    try {
      const result = await request("/v1/auth/introspect", { method: "POST", body: { token, signature } });
      return result.valid === true;
    } catch (error) { clientError("session_check_failed", error); return false; }
  }

  window.OF8Account = Object.freeze({
    login, logout, getItem, setItem, removeItem, clear, deleteDomainData, keys, length, key,
    accountInfo, getAccountInfo, usage, getUsage, isLoggedIn, sync: syncFromServer, constants: OF8_CLIENT_CONFIG,
    readCache,
  });

  clientLog("client_service_ready", { version: 2, origin: location.origin });
})();
