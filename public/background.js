console.log("[TooManyTabs] background service worker loaded");

const API_BASE_URL = "http://localhost:3000";
const GOOGLE_CLIENT_ID =
  "190659497018-47k9282ahh45v956e68qkbr9c5iheu7g.apps.googleusercontent.com";
const SYNC_ALARM_NAME = "toomanytabs-periodic-sync";
const SYNC_INTERVAL_MINUTES = 5;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "display-tabs",
      title: "Open TooManyTabs",
      contexts: ["page", "action"],
    });
    chrome.contextMenus.create({
      id: "save-current-tabs",
      title: "Save All Tabs",
      contexts: ["page", "action"],
    });
    chrome.contextMenus.create({
      id: "save-this-tab",
      title: "Save This Tab",
      contexts: ["page", "action"],
    });
  });

  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  migrateLegacySessions().catch((e) => console.error("[migrate]", e));
});

async function migrateLegacySessions() {
  const { tabGroups = [], savedSessions = [] } = await chrome.storage.local.get([
    "tabGroups",
    "savedSessions",
  ]);
  if (!Array.isArray(savedSessions) || savedSessions.length === 0) return;

  const migrated = savedSessions.map((s) => ({
    id: crypto.randomUUID(),
    name: s.groupLabel || `Session ${new Date(s.timestamp || Date.now()).toLocaleString()}`,
    pinned: false,
    tabs: (s.tabs || []).map((t, i) => ({
      url: t.url,
      title: t.title || "Untitled",
      favIconUrl: t.favIconUrl || null,
      position: i,
    })),
    updatedAt: new Date(s.timestamp || Date.now()).toISOString(),
    deleted: false,
    dirty: true,
  }));

  await chrome.storage.local.set({
    tabGroups: [...migrated, ...(tabGroups || [])],
    savedSessions: [],
  });
  console.log(`[TooManyTabs] Migrated ${migrated.length} legacy sessions → tabGroups`);
}

function notify(title, message) {
  try {
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#34D399" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
  } catch (_) {}
  console.log(`[TooManyTabs] ${title}: ${message}`);
}

async function openShelf() {
  const url = chrome.runtime.getURL("index.html");
  const tabs = await chrome.tabs.query({ url });
  if (tabs[0]?.id) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId) await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url, active: true });
  }
}

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  fullSync().catch((e) => console.error("[sync] startup sync failed:", e));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    fullSync().catch((e) => console.error("[sync] periodic sync failed:", e));
  }
});

chrome.action.onClicked.addListener(() => {
  openShelf();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "display-tabs") {
    openShelf();
  } else if (info.menuItemId === "save-current-tabs") {
    saveAllCurrentTabs()
      .then(async (group) => {
        if (group) {
          notify("Saved", group.name);
          await openShelf();
        }
      })
      .catch((e) => console.error(e));
  } else if (info.menuItemId === "save-this-tab") {
    if (tab && tab.url && tab.title) {
      saveSingleTab(tab)
        .then(async (group) => {
          if (group) {
            notify("Saved", group.name);
            await openShelf();
          }
        })
        .catch((e) => console.error(e));
    }
  }
});

async function getLocalGroups() {
  const { tabGroups = [] } = await chrome.storage.local.get("tabGroups");
  return tabGroups;
}

async function setLocalGroups(groups) {
  await chrome.storage.local.set({ tabGroups: groups });
}

function isValidTabUrl(url) {
  return url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://") && !url.startsWith("edge://") && !url.startsWith("brave://");
}

async function saveAllCurrentTabs(groupName) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const validTabs = tabs.filter((t) => isValidTabUrl(t.url));
    if (validTabs.length === 0) return null;

    const formattedTabs = validTabs.map((t, i) => ({
      url: t.url,
      title: t.title || "Untitled",
      favIconUrl: t.favIconUrl || null,
      position: i,
    }));

    const groups = await getLocalGroups();
    const newGroup = {
      id: crypto.randomUUID(),
      name: groupName || `Session ${new Date().toLocaleString()}`,
      pinned: false,
      tabs: formattedTabs,
      updatedAt: new Date().toISOString(),
      deleted: false,
      dirty: true,
    };
    groups.unshift(newGroup);
    await setLocalGroups(groups);

    // Avoid closing the last tab in the window (would close the browser window)
    const idsToClose = validTabs.map((t) => t.id);
    if (idsToClose.length >= tabs.length && tabs.length <= 1) {
      // keep the single tab open
    } else if (idsToClose.length >= tabs.length) {
      // leave one tab so the window stays open
      chrome.tabs.remove(idsToClose.slice(0, -1));
    } else {
      chrome.tabs.remove(idsToClose);
    }

    try {
      chrome.action.setBadgeText({ text: String(groups.filter((g) => !g.deleted).length) });
      chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
      setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
    } catch (_) {}

    pushSyncQueue().catch((e) => console.error("[sync] push after save failed:", e));
    return newGroup;
  } catch (err) {
    console.error("[TooManyTabs] Error saving tabs:", err);
    throw err;
  }
}

async function saveSingleTab(tab) {
  try {
    if (!isValidTabUrl(tab.url)) return null;

    const groups = await getLocalGroups();
    const newGroup = {
      id: crypto.randomUUID(),
      name: tab.title || "Untitled",
      pinned: false,
      tabs: [
        {
          url: tab.url,
          title: tab.title || "Untitled",
          favIconUrl: tab.favIconUrl || null,
          position: 0,
        },
      ],
      updatedAt: new Date().toISOString(),
      deleted: false,
      dirty: true,
    };
    groups.unshift(newGroup);
    await setLocalGroups(groups);

    if (tab.id != null) chrome.tabs.remove(tab.id);
    pushSyncQueue().catch((e) => console.error("[sync] push after save failed:", e));
    return newGroup;
  } catch (err) {
    console.error("[TooManyTabs] Error saving tab:", err);
    throw err;
  }
}

function base64UrlEncode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(digest);
}

function detectPlatform() {
  return navigator.userAgent.includes("Edg/")
    ? "edge"
    : navigator.userAgent.includes("Brave")
      ? "brave"
      : "chrome";
}

async function completeBackendAuth(payload) {
  const platform = detectPlatform();
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      deviceName: `${platform} on ${navigator.platform}`,
      platform,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Backend authentication failed: ${errText}`);
  }

  const data = await res.json();
  await chrome.storage.local.set({
    authToken: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
    deviceId: data.deviceId,
    lastSyncedAt: null,
  });

  fullSync().catch((e) => console.error("[sync] post-login sync failed:", e));
  return data;
}

// Prefer Chrome's built-in Google account token (avoids invalid_request from WebAuthFlow
// when the Cloud project / client type is misconfigured). Fall back to code+PKCE.
async function loginWithGoogle() {
  // Path 1: getAuthToken — uses the oauth2 block in manifest.json
  try {
    const accessToken = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!token) {
          reject(new Error("No access token returned"));
          return;
        }
        resolve(token);
      });
    });
    console.log("[auth] getAuthToken succeeded");
    return await completeBackendAuth({ accessToken });
  } catch (err) {
    console.warn("[auth] getAuthToken failed, trying WebAuthFlow:", err?.message || err);
  }

  // Path 2: launchWebAuthFlow + PKCE (needs Web client + GOOGLE_CLIENT_SECRET on server)
  const redirectUri = chrome.identity.getRedirectURL();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  let redirectResult;
  try {
    redirectResult = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });
  } catch (err) {
    throw new Error(
      `Google login failed (${err?.message || err}).\n\n` +
        `Your OAuth client (project "seguroamigo") is likely the wrong type.\n` +
        `Fix:\n` +
        `1. Google Cloud → create a NEW "Chrome Extension" OAuth client, paste Client ID into manifest.json oauth2.client_id + background.js\n` +
        `   OR create a "Web application" client, add redirect URI:\n   ${redirectUri}\n` +
        `   and set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in server/.env\n` +
        `2. Restart server, rebuild extension, reload unpacked`
    );
  }

  if (!redirectResult) {
    throw new Error("Google login was cancelled.");
  }

  const resultUrl = new URL(redirectResult);
  const oauthError = resultUrl.searchParams.get("error");
  if (oauthError) {
    throw new Error(`Google returned: ${oauthError}`);
  }

  const code = resultUrl.searchParams.get("code");
  if (!code) {
    throw new Error("No authorization code returned from Google");
  }

  return completeBackendAuth({ code, codeVerifier, redirectUri });
}

async function logout() {
  const { authToken } = await chrome.storage.local.get("authToken");
  if (authToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (_) {}
  }
  await chrome.storage.local.remove([
    "authToken",
    "refreshToken",
    "user",
    "deviceId",
    "lastSyncedAt",
  ]);
}

async function authedFetch(path, options = {}) {
  const { authToken, refreshToken } = await chrome.storage.local.get([
    "authToken",
    "refreshToken",
  ]);
  if (!authToken) throw new Error("Not logged in");

  const doFetch = (token) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

  let res = await doFetch(authToken);

  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const { token } = await refreshRes.json();
      await chrome.storage.local.set({ authToken: token });
      res = await doFetch(token);
    } else {
      await logout();
      throw new Error("Session expired, please log in again");
    }
  }

  return res;
}

async function pushSyncQueue() {
  const { authToken } = await chrome.storage.local.get("authToken");
  if (!authToken) return;

  const groups = await getLocalGroups();
  const dirty = groups.filter((g) => g.dirty);
  if (dirty.length === 0) return;

  const res = await authedFetch("/sync/push", {
    method: "POST",
    body: JSON.stringify({
      groups: dirty.map((g) => ({
        id: g.id,
        name: g.name,
        pinned: g.pinned,
        deleted: !!g.deleted,
        updatedAt: g.updatedAt,
        tabs: g.tabs,
      })),
    }),
  });

  if (!res.ok) throw new Error(`Push failed: ${await res.text()}`);

  const { accepted = [], conflicts = [] } = await res.json();
  const acceptedSet = new Set(accepted);

  const updated = groups.map((g) => {
    if (acceptedSet.has(g.id)) return { ...g, dirty: false };
    const conflict = conflicts.find((c) => c.id === g.id);
    if (conflict) return { ...toLocalShape(conflict), dirty: false };
    return g;
  });

  await setLocalGroups(updated.filter((g) => !g.deleted || g.dirty));
}

async function pullSyncChanges() {
  const { authToken, lastSyncedAt } = await chrome.storage.local.get([
    "authToken",
    "lastSyncedAt",
  ]);
  if (!authToken) return;

  const since = lastSyncedAt || "1970-01-01T00:00:00.000Z";
  const res = await authedFetch(`/sync/pull?since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error(`Pull failed: ${await res.text()}`);

  const { serverTime, groups: remoteGroups } = await res.json();
  const localGroups = await getLocalGroups();
  const localById = new Map(localGroups.map((g) => [g.id, g]));

  for (const remote of remoteGroups) {
    const local = localById.get(remote.id);
    if (remote.deleted) {
      localById.delete(remote.id);
      continue;
    }
    if (local && local.dirty && new Date(local.updatedAt) > new Date(remote.updatedAt)) {
      continue;
    }
    localById.set(remote.id, toLocalShape(remote));
  }

  await setLocalGroups(Array.from(localById.values()));
  await chrome.storage.local.set({ lastSyncedAt: serverTime });
}

function toLocalShape(remote) {
  return {
    id: remote.id,
    name: remote.name,
    pinned: !!remote.pinned,
    tabs: remote.tabs || [],
    updatedAt: remote.updatedAt,
    deleted: !!remote.deleted,
    dirty: false,
  };
}

async function fullSync() {
  await pushSyncQueue();
  await pullSyncChanges();
}

async function updateGroup(groupId, patch) {
  const groups = await getLocalGroups();
  const updated = groups.map((g) =>
    g.id === groupId
      ? {
          ...g,
          ...patch,
          updatedAt: new Date().toISOString(),
          dirty: true,
        }
      : g
  );
  await setLocalGroups(updated);
  pushSyncQueue().catch((e) => console.error(e));
  return updated.find((g) => g.id === groupId);
}

async function deleteGroup(groupId) {
  const groups = await getLocalGroups();
  const updated = groups.map((g) =>
    g.id === groupId
      ? { ...g, deleted: true, updatedAt: new Date().toISOString(), dirty: true }
      : g
  );
  await setLocalGroups(updated);
  try {
    await pushSyncQueue();
    const after = await getLocalGroups();
    await setLocalGroups(after.filter((g) => g.id !== groupId));
  } catch (e) {
    console.error("[sync] delete push failed:", e);
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action } = request;

  if (action === "googleLogin") {
    loginWithGoogle()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "getRedirectUri") {
    sendResponse({ redirectUri: chrome.identity.getRedirectURL() });
    return false;
  }

  if (action === "logout") {
    logout()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "getAuthState") {
    chrome.storage.local.get(["authToken", "user"]).then(({ authToken, user }) => {
      sendResponse({ loggedIn: !!authToken, user: user || null });
    });
    return true;
  }

  if (action === "getAllTabs") {
    chrome.tabs.query({ currentWindow: true }, (tabs) => sendResponse({ tabs }));
    return true;
  }

  if (action === "getGroups") {
    getLocalGroups().then((groups) =>
      sendResponse({ groups: groups.filter((g) => !g.deleted) })
    );
    return true;
  }

  if (action === "saveAllTabs") {
    saveAllCurrentTabs(request.name)
      .then((group) => sendResponse({ success: true, group }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "saveTabs") {
    // Save a provided tab list as a named group (used by the React UI)
    (async () => {
      const tabs = (request.tabs || []).filter((t) => isValidTabUrl(t.url));
      if (tabs.length === 0) {
        sendResponse({ success: false, error: "No valid tabs" });
        return;
      }
      const groups = await getLocalGroups();
      const newGroup = {
        id: crypto.randomUUID(),
        name: request.name || `Session ${new Date().toLocaleString()}`,
        pinned: false,
        tabs: tabs.map((t, i) => ({
          url: t.url,
          title: t.title || "Untitled",
          favIconUrl: t.favIconUrl || null,
          position: i,
        })),
        updatedAt: new Date().toISOString(),
        deleted: false,
        dirty: true,
      };
      groups.unshift(newGroup);
      await setLocalGroups(groups);
      pushSyncQueue().catch((e) => console.error(e));
      sendResponse({ success: true, group: newGroup });
    })().catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "renameGroup") {
    updateGroup(request.groupId, { name: request.name })
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "togglePin") {
    getLocalGroups().then(async (groups) => {
      const current = groups.find((g) => g.id === request.groupId);
      if (!current) {
        sendResponse({ success: false, error: "Group not found" });
        return;
      }
      await updateGroup(request.groupId, { pinned: !current.pinned });
      sendResponse({ success: true });
    });
    return true;
  }

  if (action === "deleteGroup") {
    deleteGroup(request.groupId)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "deleteTabFromGroup") {
    (async () => {
      const groups = await getLocalGroups();
      const withSoftDelete = groups.map((g) => {
        if (g.id !== request.groupId) return g;
        const nextTabs = g.tabs.filter((_, i) => i !== request.tabIndex);
        if (nextTabs.length === 0) {
          return {
            ...g,
            tabs: [],
            deleted: true,
            updatedAt: new Date().toISOString(),
            dirty: true,
          };
        }
        return {
          ...g,
          tabs: nextTabs.map((t, i) => ({ ...t, position: i })),
          updatedAt: new Date().toISOString(),
          dirty: true,
        };
      });

      await setLocalGroups(withSoftDelete);
      pushSyncQueue()
        .then(async () => {
          const after = await getLocalGroups();
          await setLocalGroups(after.filter((g) => !g.deleted));
        })
        .catch((e) => console.error(e));

      sendResponse({
        success: true,
        groups: withSoftDelete.filter((g) => !g.deleted),
      });
    })().catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "restoreTabs") {
    (request.urls || []).forEach((url) => chrome.tabs.create({ url }));
    sendResponse({ success: true });
    return false;
  }

  if (action === "restoreSingleTab") {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
    return false;
  }

  if (action === "closeTabs") {
    chrome.tabs.remove(request.tabIds);
    sendResponse({ success: true });
    return false;
  }

  if (action === "manualSync") {
    fullSync()
      .then(async () => {
        const groups = await getLocalGroups();
        sendResponse({ success: true, groups: groups.filter((g) => !g.deleted) });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === "pushDirty") {
    pushSyncQueue()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});
