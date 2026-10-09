import "@material/web/all.js";
import { styles as typescaleStyles } from "@material/web/typography/md-typescale-styles.js";

(() => {
  "use strict";

  const API_BASE = "https://sentaro-0f8-accounts.takesen2278.workers.dev";
  const TOKEN_COOKIE = "__Host-of8_access_token";
  const SIGNATURE_COOKIE = "__Host-of8_access_signature";
  const LEGACY_TOKEN_COOKIE = "of8_access_token";
  const LEGACY_SIGNATURE_COOKIE = "of8_access_signature";
  const DATA_KEY_STORAGE = "__of8_data_access_key_v2__";
  const MANAGEMENT_ORIGIN = "https://search3958.github.io";
  const LOGIN_URL = "https://search3958.github.io/support/accounts/account-login.html";
  const GREETING_UPDATE_INTERVAL_MS = 60 * 1000;
  const LOGIN_STATE_STORAGE = "__of8_dashboard_login_state_v2__";

  let currentAccount = null;
  let greetingTimer = null;

  function log(event, details = {}) {
    console.log("[0f8-dashboard]", event, details);
  }

  function errorLog(event, error, details = {}) {
    console.error(
      "[0f8-dashboard]",
      event,
      error instanceof Error ? error.message : String(error),
      details,
    );
  }

  function required(id) {
    const element = document.getElementById(id);
    if (!element) {
      const error = new Error(`Required element not found: #${id}`);
      console.error("[0f8-dashboard]", error.message);
      throw error;
    }
    return element;
  }

  function cookie(name) {
    const prefix = `${encodeURIComponent(name)}=`;
    const item = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(prefix));
    if (!item) {
      log("cookie_not_found", { name });
      return "";
    }
    try {
      return decodeURIComponent(item.slice(prefix.length));
    } catch (error) {
      errorLog("cookie_decode_failed", error, { name });
      return "";
    }
  }

  function sessionCookie(name, legacyName) {
    const value = cookie(name);
    if (value) return value;
    const legacy = cookie(legacyName);
    if (legacy) log("legacy_cookie_detected", { name: legacyName });
    return legacy;
  }

  function setCookie(name, value) {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=259200; Path=/; Secure; SameSite=Strict`;
    log("cookie_saved", { name });
  }

  function delCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; Secure; SameSite=Strict`;
    log("cookie_deleted", { name });
  }

  function setStatus(id, message, kind = "") {
    const element = required(id);
    element.textContent = String(message ?? "");
    element.dataset.kind = kind;
    log("status_updated", { id, kind, message: element.textContent });
  }

  const textDecoder = new TextDecoder();

  function base64UrlBytes(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("Base64URLの形式が不正です。");
    }
    const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
    let binary;
    try {
      binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      throw new Error("Base64URLの形式が不正です。");
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function decodeTokenId(token) {
    const parts = String(token).split(".");
    if (parts.length !== 6 || parts[0] !== "v1") {
      throw new Error("アクセストークンの形式が不正です。");
    }
    const idBytes = base64UrlBytes(parts[3]);
    try {
      return textDecoder.decode(idBytes);
    } catch {
      throw new Error("アクセストークンのIDを読み取れませんでした。");
    }
  }

  function base64Url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  async function fileToBase64Url(file) {
    if (!(file instanceof File)) {
      throw new Error("アイコンファイルが正しく指定されていません。");
    }
    return base64Url(new Uint8Array(await file.arrayBuffer()));
  }

  function imageDimensions(file) {
    if (!(file instanceof File)) {
      return Promise.reject(new Error("アイコンファイルが正しく指定されていません。"));
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        const dimensions = {
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
        log("icon_dimensions_checked", {
          name: file.name,
          ...dimensions,
        });
        resolve(dimensions);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("アイコン画像を読み込めませんでした。"));
      };
      image.src = url;
    });
  }

  function isManagementOrigin() {
    return location.origin.toLowerCase() === MANAGEMENT_ORIGIN;
  }

  function clearSession() {
    delCookie(TOKEN_COOKIE);
    delCookie(SIGNATURE_COOKIE);
    delCookie(LEGACY_TOKEN_COOKIE);
    delCookie(LEGACY_SIGNATURE_COOKIE);
    localStorage.removeItem(DATA_KEY_STORAGE);
    currentAccount = null;
    log("session_cleared");
  }

  function getGreeting(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 7) return "朝早いですね";
    if (hour >= 7 && hour < 11) return "おはようございます";
    if (hour >= 11 && hour < 17) return "こんにちは";
    if (hour >= 17 && hour < 22) return "こんばんは";
    return "もう夜ですね";
  }

  function updateGreeting() {
    const greeting = required("dashboard-greeting");
    const nextGreeting = getGreeting();
    if (greeting.textContent !== nextGreeting) {
      greeting.textContent = nextGreeting;
      log("greeting_updated", { greeting: nextGreeting });
    }
  }

  function startGreetingClock() {
    if (greetingTimer !== null) window.clearInterval(greetingTimer);
    updateGreeting();
    greetingTimer = window.setInterval(updateGreeting, GREETING_UPDATE_INTERVAL_MS);
    log("greeting_clock_started", { intervalMs: GREETING_UPDATE_INTERVAL_MS });
  }

  async function api(path, options = {}) {
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error("APIパスが不正です。");
    }
    const headers = new Headers({
      Accept: "application/json",
      ...(options.headers || {}),
    });
    const token = sessionCookie(TOKEN_COOKIE, LEGACY_TOKEN_COOKIE);
    const signature = sessionCookie(SIGNATURE_COOKIE, LEGACY_SIGNATURE_COOKIE);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (signature) headers.set("X-OF8-Signature", signature);
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (options.dataAccess === true) {
      const accessKey = localStorage.getItem(DATA_KEY_STORAGE) || "";
      if (!accessKey) {
        throw new Error("データアクセスキーがありません。再ログインしてください。");
      }
      const keyBytes = base64UrlBytes(accessKey);
      if (keyBytes.length !== 32) {
        throw new Error("データアクセスキーの長さが不正です。再ログインしてください。");
      }
      headers.set("X-OF8-Data-Access-Key", accessKey);
    }

    log("api_request", { path, method: options.method || "GET" });
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      credentials: "omit",
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      errorLog("api_json_parse_failed", error, { path, status: response.status });
      throw new Error(`サーバー応答をJSONとして読み取れませんでした (${response.status})。`);
    }
    if (!response.ok || data?.ok !== true) {
      const message = data?.error?.message || `リクエストに失敗しました (${response.status})。`;
      errorLog("api_request_failed", new Error(message), {
        path,
        status: response.status,
        code: data?.error?.code,
      });
      throw new Error(message);
    }
    if (data.token && data.signature) {
      setCookie(TOKEN_COOKIE, data.token);
      setCookie(SIGNATURE_COOKIE, data.signature);
      log("token_rotated", { path });
    }
    log("api_success", { path, status: response.status });
    return data;
  }

  function setDisabled(id, disabled) {
    const element = required(id);
    element.disabled = Boolean(disabled);
    log("control_disabled_changed", { id, disabled: Boolean(disabled) });
  }

  function renderAccount(account) {
    if (!account || typeof account !== "object" || typeof account.id !== "string") {
      throw new Error("アカウント情報が不正です。");
    }
    currentAccount = account;
    required("login-card").classList.add("account-hidden");
    required("dashboard-card").classList.remove("account-hidden");
    required("account-id").textContent = `@${account.id}`;
    required("account-name-summary").textContent = account.name || "名前未設定";
    required("dashboard-title").textContent = account.name || "アカウント";
    required("account-name").value = account.name || "";

    const fallback = required("account-avatar-fallback");
    const fallbackText = [...(account.name || account.id || "0")][0] || "0";
    fallback.textContent = fallbackText.toUpperCase();
    const icon = required("account-icon");
    if (account.icon && typeof account.icon === "string") {
      icon.src = `data:${account.iconMimeType || "image/png"};base64,${account.icon}`;
      icon.hidden = false;
      fallback.hidden = true;
      log("icon_loaded");
    } else {
      icon.removeAttribute("src");
      icon.hidden = true;
      fallback.hidden = false;
      log("icon_not_set");
    }

    const allowed = isManagementOrigin();
    setDisabled("open-name-dialog", !allowed);
    setDisabled("select-icon-button", !allowed);
    setDisabled("remove-icon", !allowed);
    setDisabled("open-password-dialog", !allowed);
    setDisabled("logout-all", !allowed);
    setDisabled("delete-account", !allowed);
    if (allowed) {
      setStatus("management-origin-status", "プロフィール・パスワード・アカウント操作を管理できます。", "success");
    } else {
      setStatus("management-origin-status", "プロフィール・パスワード変更と一部の管理操作は search3958.github.io からのみ許可されます。", "error");
    }
    updateGreeting();
    log("account_rendered", { id: account.id });
  }

  function resetLoginView(message = "") {
    required("dashboard-card").classList.add("account-hidden");
    required("login-card").classList.remove("account-hidden");
    if (message) setStatus("dashboard-login-status", message, "success");
    log("login_view_reset", { message });
  }

  function clearNameDialog() {
    const field = required("account-name");
    field.value = currentAccount?.name || "";
    field.error = false;
    field.errorText = "";
    setStatus("name-dialog-status", "");
  }

  function clearPasswordDialog() {
    required("current-password").value = "";
    required("new-password").value = "";
    required("current-password").type = "password";
    required("new-password").type = "password";
    required("toggle-current-password").selected = false;
    required("toggle-new-password").selected = false;
    setStatus("password-dialog-status", "");
  }

  async function openDialog(id) {
    const dialog = required(id);
    if (typeof dialog.show !== "function") {
      console.error(`[0f8-dashboard] Dialog API unavailable: #${id}`);
      throw new Error("ダイアログを開けませんでした。");
    }
    await dialog.show();
    log("dialog_opened", { id });
  }

  async function closeDialog(id) {
    const dialog = required(id);
    if (!dialog.open) {
      log("dialog_already_closed", { id });
      return;
    }
    await dialog.close();
    log("dialog_closed", { id });
  }

  async function openNameDialog() {
    if (!isManagementOrigin()) {
      console.error("[0f8-dashboard] Name change is unavailable outside management origin.");
      return;
    }
    clearNameDialog();
    await openDialog("name-dialog");
    required("account-name").focus();
  }

  async function openPasswordDialog() {
    if (!isManagementOrigin()) {
      console.error("[0f8-dashboard] Password change is unavailable outside management origin.");
      return;
    }
    clearPasswordDialog();
    await openDialog("password-dialog");
    required("current-password").focus();
  }

  function validateNameField() {
    const field = required("account-name");
    const value = String(field.value || "").trim();
    if (!value) {
      field.error = true;
      field.errorText = "名前を入力してください。";
      console.error("[0f8-dashboard] Name validation failed: empty");
      return null;
    }
    if ([...value].length > 80) {
      field.error = true;
      field.errorText = "名前は80文字以内で入力してください。";
      console.error("[0f8-dashboard] Name validation failed: too long");
      return null;
    }
    field.error = false;
    field.errorText = "";
    return value;
  }

  async function saveName() {
    if (!isManagementOrigin()) {
      throw new Error("プロフィール編集は search3958.github.io からのみ許可されています。");
    }
    const name = validateNameField();
    if (!name) throw new Error("入力内容を確認してください。");

    const button = required("save-name");
    button.disabled = true;
    setStatus("name-dialog-status", "保存しています…");
    try {
      const data = await api("/v1/account/profile", {
        method: "POST",
        body: { name },
      });
      renderAccount(data.account);
      setStatus("dashboard-status", "名前を保存しました。", "success");
      await closeDialog("name-dialog");
      log("name_changed", { id: data.account.id });
    } finally {
      button.disabled = false;
    }
  }

  async function saveIcon() {
    if (!isManagementOrigin()) {
      throw new Error("プロフィール・アイコン編集は search3958.github.io からのみ許可されています。");
    }
    const input = required("account-icon-file");
    const file = input.files?.[0];
    if (!file) throw new Error("アイコン画像を選択してください。");
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
      throw new Error("PNG、JPEG、WebP、GIFの画像を選択してください。");
    }
    if (file.size > 13 * 1024) throw new Error("アイコンは13KB以内にしてください。");
    const dimensions = await imageDimensions(file);
    if (dimensions.width !== 64 || dimensions.height !== 64) {
      throw new Error("アイコンは64x64pxにしてください。");
    }
    const body = {
      iconBase64Url: await fileToBase64Url(file),
      iconMimeType: file.type,
    };
    const button = required("select-icon-button");
    button.disabled = true;
    try {
      const data = await api("/v1/account/profile", {
        method: "POST",
        body,
      });
      input.value = "";
      required("icon-file-name").textContent = "64×64px / 13KB以内";
      renderAccount(data.account);
      setStatus("dashboard-status", "アイコンを保存しました。", "success");
      log("icon_changed", { id: data.account.id });
    } finally {
      button.disabled = false;
    }
  }

  async function removeIcon() {
    if (!isManagementOrigin()) {
      throw new Error("プロフィール・アイコン編集は search3958.github.io からのみ許可されています。");
    }
    const button = required("remove-icon");
    button.disabled = true;
    try {
      const data = await api("/v1/account/profile", {
        method: "POST",
        body: { removeIcon: true },
      });
      renderAccount(data.account);
      required("icon-file-name").textContent = "64×64px / 13KB以内";
      setStatus("dashboard-status", "アイコンを削除しました。", "success");
      log("icon_removed", { id: data.account.id });
    } finally {
      button.disabled = false;
    }
  }

  function getTextFieldValue(id) {
    return String(required(id).value || "");
  }

  function validatePasswordFields() {
    const currentPassword = getTextFieldValue("current-password");
    const newPassword = getTextFieldValue("new-password");
    if ([currentPassword, newPassword].some((value) => [...value].length < 8)) {
      console.error("[0f8-dashboard] Password validation failed: minimum length");
      setStatus("password-dialog-status", "パスワードは8文字以上で入力してください。", "error");
      return null;
    }
    if ([currentPassword, newPassword].some((value) => [...value].length > 128)) {
      console.error("[0f8-dashboard] Password validation failed: maximum length");
      setStatus("password-dialog-status", "パスワードは128文字以内で入力してください。", "error");
      return null;
    }
    if (currentPassword === newPassword) {
      console.error("[0f8-dashboard] Password validation failed: unchanged");
      setStatus("password-dialog-status", "新しいパスワードは現在のパスワードと異なるものにしてください。", "error");
      return null;
    }
    return { currentPassword, newPassword };
  }

  async function changePassword() {
    if (!isManagementOrigin()) {
      throw new Error("パスワード変更は search3958.github.io からのみ許可されています。");
    }
    const passwords = validatePasswordFields();
    if (!passwords) throw new Error("入力内容を確認してください。");

    const button = required("save-password");
    button.disabled = true;
    setStatus("password-dialog-status", "パスワードを変更しています…");
    try {
      await api("/v1/account/password", {
        method: "POST",
        body: passwords,
      });
      clearPasswordDialog();
      await closeDialog("password-dialog");
      clearSession();
      resetLoginView("パスワードを変更しました。全保存データも新しい鍵で再暗号化されています。");
      log("password_changed");
    } finally {
      button.disabled = false;
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    for (const unit of units) {
      if (value < 1024 || unit === units.at(-1)) {
        return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
      }
      value /= 1024;
    }
    return `${bytes} B`;
  }

  async function loadUsage() {
    setStatus("usage-status", "容量を取得しています…");
    const data = await api("/v1/account/usage");
    const usage = data.usage;
    if (!usage || !Array.isArray(usage.domains)) {
      throw new Error("容量情報の形式が不正です。");
    }

    required("usage-total").textContent = `${Number(usage.dataChars || 0).toLocaleString()}文字 / ${formatBytes(Number(usage.dataBytes))}`;
    required("usage-icon").textContent = formatBytes(Number(usage.iconBytes));
    required("usage-account-total").textContent = formatBytes(Number(usage.accountStorageBytes));

    const maxDataChars = Number(usage.maxDataChars);
    const dataChars = Number(usage.dataChars);
    const ratio = Number.isFinite(maxDataChars) && maxDataChars > 0
      ? Math.min(1, Math.max(0, dataChars / maxDataChars))
      : 0;
    required("usage-progress").value = ratio;
    required("usage-percent").textContent = `${Math.round(ratio * 100)}%`;

    const list = required("usage-domains");
    list.textContent = "";
    if (!usage.domains.length) {
      const emptyItem = document.createElement("md-list-item");
      emptyItem.textContent = "保存データはありません。";
      list.appendChild(emptyItem);
      log("usage_domains_empty");
    }

    for (const row of usage.domains) {
      if (!row || typeof row.domain !== "string") {
        console.error("[0f8-dashboard] Invalid domain usage row detected.");
        continue;
      }
      const item = document.createElement("md-list-item");
      const domain = document.createElement("div");
      const supporting = document.createElement("div");
      const deleteButton = document.createElement("md-outlined-button");
      domain.slot = "headline";
      domain.textContent = row.domain;
      supporting.slot = "supporting-text";
      supporting.textContent = `${Number(row.encryptedChars || 0).toLocaleString()}文字 / ${formatBytes(Number(row.encryptedBytes))}`;
      deleteButton.type = "button";
      deleteButton.textContent = "削除";
      deleteButton.slot = "end";
      deleteButton.disabled = !isManagementOrigin();
      deleteButton.title = isManagementOrigin()
        ? "このドメインの保存データをすべて削除"
        : "管理画面からのみ削除できます";

      deleteButton.addEventListener("click", async () => {
        if (!isManagementOrigin()) {
          console.error("[0f8-dashboard] Domain delete is unavailable outside management origin.");
          return;
        }
        if (!window.confirm(`${row.domain} の保存データをすべて削除します。続行しますか？`)) {
          log("domain_delete_cancelled", { domain: row.domain });
          return;
        }
        deleteButton.disabled = true;
        try {
          await api("/v1/account/domain", {
            method: "DELETE",
            body: { domain: row.domain },
          });
          log("domain_deleted", { domain: row.domain });
          await loadUsage();
          setStatus("usage-status", `${row.domain} の保存データを削除しました。`, "success");
        } catch (error) {
          errorLog("domain_delete_failed", error, { domain: row.domain });
          setStatus("usage-status", error.message, "error");
          deleteButton.disabled = false;
        }
      });
      item.append(domain, supporting, deleteButton);
      list.appendChild(item);
    }

    setStatus(
      "usage-status",
      Number.isFinite(maxDataChars)
        ? `データ上限: ${maxDataChars.toLocaleString()}文字`
        : "容量を取得しました。",
    );
    log("usage_loaded", {
      domains: usage.domains.length,
      dataBytes: Number(usage.dataBytes || 0),
      dataChars,
    });
  }

  async function load() {
    const data = await api("/v1/account/info");
    renderAccount(data.account);
    await loadUsage();
    log("dashboard_loaded", { id: data.account.id });
  }

  async function login() {
    const state = base64Url(crypto.getRandomValues(new Uint8Array(24)));
    const popupUrl = new URL(LOGIN_URL);
    const returnOrigin = location.origin.toLowerCase();
    popupUrl.searchParams.set("origin", returnOrigin);
    popupUrl.searchParams.set("state", state);

    // 管理サイトだけはログイン画面と同じオリジンでも許可します。
    // それ以外のオリジンで同一オリジンになった場合は従来どおり拒否します。
    if (popupUrl.origin === returnOrigin && returnOrigin !== MANAGEMENT_ORIGIN) {
      console.error("[0f8-dashboard] login_popup_invalid_origin", {
        popupOrigin: popupUrl.origin,
        returnOrigin,
        allowedSameOrigin: MANAGEMENT_ORIGIN,
      });
      throw new Error("ログイン画面の配信元がアカウントサービスと一致していません。");
    }

    log("login_popup_opening", {
      origin: returnOrigin,
      popupOrigin: popupUrl.origin,
      sameOriginAllowed: popupUrl.origin === returnOrigin,
      managementOriginAllowlisted: returnOrigin === MANAGEMENT_ORIGIN,
    });

    const features = "popup=yes,width=460,height=720";
    const popup = window.open("about:blank", `of8-dashboard-login-${state}`, features);
    if (!popup) {
      console.error("[0f8-dashboard] login_popup_blocked");
      throw new Error("ログインポップアップがブロックされました。");
    }
    sessionStorage.setItem(LOGIN_STATE_STORAGE, state);

    let cleanupLoginWait = () => {};
    const resultPromise = new Promise((resolve, reject) => {
      const expectedOrigin = popupUrl.origin;
      let settled = false;
      let closeTimer = null;
      let timeout = null;

      function cleanup() {
        if (closeTimer !== null) window.clearInterval(closeTimer);
        if (timeout !== null) window.clearTimeout(timeout);
        window.removeEventListener("message", handler);
        if (sessionStorage.getItem(LOGIN_STATE_STORAGE) === state) {
          sessionStorage.removeItem(LOGIN_STATE_STORAGE);
        }
      }

      cleanupLoginWait = cleanup;

      function fail(message, details = {}) {
        if (settled) return;
        settled = true;
        cleanup();
        errorLog("login_popup_failed", new Error(message), details);
        reject(new Error(message));
      }

      function handler(event) {
        if (event.origin !== expectedOrigin || event.source !== popup) return;
        const message = event.data;
        if (!message || message.type !== "OF8_AUTH_RESULT" || message.version !== 2 || message.state !== state) return;
        if (
          typeof message.accessToken !== "string" ||
          typeof message.signature !== "string" ||
          typeof message.dataAccessKey !== "string"
        ) {
          fail("認証結果が不正です。");
          return;
        }

        try {
          const decodedId = decodeTokenId(message.accessToken);
          const decodedKey = base64UrlBytes(message.dataAccessKey);
          if (decodedKey.length !== 32) {
            throw new Error("データアクセスキーの長さが不正です。");
          }
          log("auth_result_received", { origin: event.origin, id: decodedId });
        } catch (error) {
          fail(error instanceof Error ? error.message : "認証結果が不正です。");
          return;
        }

        if (settled) return;
        settled = true;
        cleanup();
        try {
          popup.close();
          log("login_popup_closed_after_result");
        } catch (error) {
          errorLog("login_popup_close_failed", error);
        }
        resolve(message);
      }

      window.addEventListener("message", handler);
      closeTimer = window.setInterval(() => {
        if (!popup.closed) return;
        fail("ログイン画面が閉じられました。", { popupClosed: true });
      }, 100);
      timeout = window.setTimeout(() => {
        try {
          popup.close();
        } catch (error) {
          errorLog("login_popup_close_failed", error);
        }
        fail("ログインウィンドウがタイムアウトしました。", { timeout: true });
      }, 5 * 60 * 1000);
      log("login_popup_monitoring_started");
    });

    try {
      // postMessage監視を登録してからログイン画面へ遷移します。
      popup.location.replace(popupUrl.toString());
      log("login_popup_navigated", { popupOrigin: popupUrl.origin });
    } catch (error) {
      cleanupLoginWait();
      try {
        popup.close();
      } catch (closeError) {
        errorLog("login_popup_close_failed", closeError);
      }
      errorLog("login_popup_navigation_failed", error, { url: popupUrl.toString() });
      throw new Error("ログイン画面を開けませんでした。");
    }

    const result = await resultPromise;
    setCookie(TOKEN_COOKIE, result.accessToken);
    setCookie(SIGNATURE_COOKIE, result.signature);
    localStorage.setItem(DATA_KEY_STORAGE, result.dataAccessKey);

    if (
      sessionCookie(TOKEN_COOKIE, LEGACY_TOKEN_COOKIE) !== result.accessToken ||
      sessionCookie(SIGNATURE_COOKIE, LEGACY_SIGNATURE_COOKIE) !== result.signature
    ) {
      console.error("[0f8-dashboard] login_cookie_persist_failed");
      throw new Error("認証情報を保存できませんでした。Cookie設定を確認してください。");
    }
    if (localStorage.getItem(DATA_KEY_STORAGE) !== result.dataAccessKey) {
      console.error("[0f8-dashboard] login_data_key_persist_failed");
      throw new Error("データアクセスキーを保存できませんでした。");
    }
    log("login_completed", { cookieSaved: true, dataAccessKeySaved: true });
    await load();
  }

  async function logoutAll() {
    if (!isManagementOrigin()) {
      throw new Error("全端末からのログアウトは search3958.github.io からのみ許可されています。");
    }
    await api("/v1/auth/logout-all", {
      method: "POST",
      body: {},
    });
    clearSession();
    resetLoginView("すべての端末からログアウトしました。");
    log("logout_all_completed");
  }

  async function logout() {
    try {
      await api("/v1/auth/logout", {
        method: "POST",
        body: {},
      });
    } finally {
      clearSession();
      resetLoginView("ログアウトしました。");
      log("logout_completed");
    }
  }

  async function deleteAccount() {
    if (!isManagementOrigin()) {
      throw new Error("アカウント削除は search3958.github.io からのみ許可されています。");
    }
    const password = window.prompt("アカウントを完全に削除します。現在のパスワードを入力してください。");
    if (password === null) {
      log("account_delete_cancelled_at_password_prompt");
      return;
    }
    if (!password) throw new Error("現在のパスワードを入力してください。");
    if (!window.confirm("アカウントと保存データを完全に削除します。続行しますか？")) {
      log("account_delete_cancelled_at_confirm");
      return;
    }
    await api("/v1/account", {
      method: "DELETE",
      body: { password },
    });
    clearSession();
    resetLoginView("アカウントを削除しました。");
    log("account_deleted");
  }

  function bindPasswordToggle(buttonId, fieldId) {
    const button = required(buttonId);
    const field = required(fieldId);
    button.addEventListener("click", () => {
      field.type = button.selected ? "text" : "password";
      button.setAttribute(
        "aria-label",
        button.selected ? "パスワードを非表示" : "パスワードを表示",
      );
      log("password_visibility_changed", { fieldId, visible: button.selected });
    });
  }

  function bindEvents() {
    required("open-name-dialog").addEventListener("click", async () => {
      try {
        await openNameDialog();
      } catch (error) {
        errorLog("name_dialog_open_failed", error);
      }
    });
    required("close-name-dialog").addEventListener("click", async () => {
      try {
        await closeDialog("name-dialog");
      } catch (error) {
        errorLog("name_dialog_close_failed", error);
      }
    });
    required("cancel-name-dialog").addEventListener("click", async () => {
      try {
        await closeDialog("name-dialog");
      } catch (error) {
        errorLog("name_dialog_cancel_failed", error);
      }
    });
    required("save-name").addEventListener("click", async () => {
      try {
        await saveName();
      } catch (error) {
        errorLog("name_change_failed", error);
        setStatus("name-dialog-status", error.message, "error");
      }
    });
    required("name-dialog-form").addEventListener("submit", (event) => {
      event.preventDefault();
      required("save-name").click();
    });

    required("select-icon-button").addEventListener("click", () => {
      required("account-icon-file").click();
      log("icon_file_picker_opened");
    });
    required("account-icon-file").addEventListener("change", async () => {
      const input = required("account-icon-file");
      const file = input.files?.[0];
      if (!file) {
        log("icon_file_selection_cleared");
        return;
      }
      required("icon-file-name").textContent = file.name;
      log("icon_file_selected", { name: file.name, size: file.size, type: file.type });
      try {
        await saveIcon();
      } catch (error) {
        errorLog("icon_change_failed", error);
        input.value = "";
        required("icon-file-name").textContent = "64×64px / 13KB以内";
        setStatus("dashboard-status", error.message, "error");
      }
    });
    required("remove-icon").addEventListener("click", async () => {
      try {
        await removeIcon();
      } catch (error) {
        errorLog("icon_remove_failed", error);
        setStatus("dashboard-status", error.message, "error");
      }
    });

    required("open-password-dialog").addEventListener("click", async () => {
      try {
        await openPasswordDialog();
      } catch (error) {
        errorLog("password_dialog_open_failed", error);
      }
    });
    required("close-password-dialog").addEventListener("click", async () => {
      try {
        await closeDialog("password-dialog");
      } catch (error) {
        errorLog("password_dialog_close_failed", error);
      }
    });
    required("cancel-password-dialog").addEventListener("click", async () => {
      try {
        await closeDialog("password-dialog");
      } catch (error) {
        errorLog("password_dialog_cancel_failed", error);
      }
    });
    required("save-password").addEventListener("click", async () => {
      try {
        await changePassword();
      } catch (error) {
        errorLog("password_change_failed", error);
        setStatus("password-dialog-status", error.message, "error");
      }
    });
    required("password-dialog-form").addEventListener("submit", (event) => {
      event.preventDefault();
      required("save-password").click();
    });

    required("logout-all").addEventListener("click", async () => {
      try {
        await logoutAll();
      } catch (error) {
        errorLog("logout_all_failed", error);
        setStatus("dashboard-status", error.message, "error");
      }
    });
    required("logout").addEventListener("click", async () => {
      try {
        await logout();
      } catch (error) {
        errorLog("logout_failed", error);
      }
    });
    required("delete-account").addEventListener("click", async () => {
      try {
        await deleteAccount();
      } catch (error) {
        errorLog("delete_account_failed", error);
        setStatus("dashboard-status", error.message, "error");
      }
    });

    required("refresh-usage").addEventListener("click", async () => {
      const button = required("refresh-usage");
      button.disabled = true;
      try {
        await loadUsage();
      } catch (error) {
        errorLog("usage_refresh_failed", error);
        setStatus("usage-status", error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
    required("refresh-dashboard").addEventListener("click", async () => {
      const button = required("refresh-dashboard");
      button.disabled = true;
      try {
        await load();
        setStatus("dashboard-status", "アカウント情報を更新しました。", "success");
      } catch (error) {
        errorLog("dashboard_refresh_failed", error);
        setStatus("dashboard-status", error.message, "error");
      } finally {
        button.disabled = false;
      }
    });

    const loginButton = required("dashboard-login");
    loginButton.addEventListener("click", async () => {
      loginButton.disabled = true;
      setStatus("dashboard-login-status", "処理中…");
      try {
        await login();
      } catch (error) {
        errorLog("login_failed", error);
        setStatus("dashboard-login-status", error.message, "error");
      } finally {
        loginButton.disabled = false;
      }
    });

    bindPasswordToggle("toggle-current-password", "current-password");
    bindPasswordToggle("toggle-new-password", "new-password");
    log("events_bound");
  }

  async function init() {
    try {
      if (Array.isArray(document.adoptedStyleSheets) && typescaleStyles?.styleSheet) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, typescaleStyles.styleSheet];
        log("typescale_styles_applied");
      } else {
        console.error("[0f8-dashboard] adoptedStyleSheets is unavailable; using component defaults.");
      }
    } catch (error) {
      errorLog("typescale_styles_apply_failed", error);
    }

    bindEvents();
    startGreetingClock();
    const hasSession = Boolean(
      sessionCookie(TOKEN_COOKIE, LEGACY_TOKEN_COOKIE) &&
      sessionCookie(SIGNATURE_COOKIE, LEGACY_SIGNATURE_COOKIE) &&
      localStorage.getItem(DATA_KEY_STORAGE),
    );

    if (hasSession) {
      try {
        await load();
        log("existing_session_loaded");
      } catch (error) {
        errorLog("session_load_failed", error);
        clearSession();
        resetLoginView("セッションを確認できませんでした。再度ログインしてください。");
      }
    } else {
      log("no_existing_session");
    }
    log("ready", {
      managementOriginAllowed: isManagementOrigin(),
      materialWeb: true,
    });
  }

  init().catch((error) => {
    errorLog("init_failed", error);
  });
})();
