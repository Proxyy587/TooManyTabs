// TooManyTabs background service worker (MV3).
// Jobs: toolbar/context-menu/keyboard entry points, quick saves, sign-in
// hand-off to the sync server, and periodic sync. The page owns all other UI.

// Replaced at build time from root .env → API_BASE_URL
const API_BASE_URL = "http://localhost:3000";

const LATER_SHELF_ID = "00000000-0000-4000-8000-000000000001";
const SYNC_ALARM = "toomanytabs-periodic-sync";
const SYNC_INTERVAL_MINUTES = 5;
const INTERNAL = /^(chrome|chrome-extension|edge|brave|about|devtools|view-source|chrome-search):/i;

// ------------------------------------------------------------------ lifecycle

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    const contexts = ["page", "action"];
    chrome.contextMenus.create({ id: "save-close-tab", title: "Save this tab and close it", contexts });
    chrome.contextMenus.create({ id: "save-tab", title: "Save this tab to Later", contexts });
    chrome.contextMenus.create({ id: "save-window", title: "Save all tabs", contexts });
    chrome.contextMenus.create({ id: "save-close-window", title: "Save all tabs and close them", contexts });
  });
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  migrateLegacySessions()
    .then(foldTitleShelves)
    .catch((e) => console.error("[migrate]", e));
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  fullSync().catch(recordSyncError);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) fullSync().catch(recordSyncError);
});

chrome.action.onClicked.addListener(() => openShelf());

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const run = {
    "save-close-tab": () => tab && saveTabToLater(tab, { close: true }),
    "save-tab": () => tab && saveTabToLater(tab, { close: false }),
    "save-window": () => tab && saveWindow(tab.windowId, { close: false }),
    "save-close-window": () => tab && saveWindow(tab.windowId, { close: true }),
  }[info.menuItemId];
  if (run) Promise.resolve(run()).catch((e) => console.error("[menu]", e));
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "save-tab-to-later") return;
  const go = tab ? Promise.resolve(tab) : chrome.tabs.query({ active: true, lastFocusedWindow: true }).then((t) => t[0]);
  go.then((t) => t && saveTabToLater(t)).catch((e) => console.error("[command]", e));
});

async function migrateLegacySessions() {
  const { tabGroups = [], savedSessions = [] } = await chrome.storage.local.get(["tabGroups", "savedSessions"]);
  if (!Array.isArray(savedSessions) || savedSessions.length === 0) return;
  const migrated = savedSessions.map((s) => ({
    id: crypto.randomUUID(),
    name: s.groupLabel || `Session ${new Date(s.timestamp || Date.now()).toLocaleString()}`,
    pinned: false,
    tabs: (s.tabs || []).map((t, i) => ({ url: t.url, title: t.title || t.url, favIconUrl: t.favIconUrl || null, position: i })),
    createdAt: new Date(s.timestamp || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
    dirty: true,
  }));
  await chrome.storage.local.set({ tabGroups: [...migrated, ...tabGroups], savedSessions: [] });
}

/**
 * Before 0.4, "Save This Tab" created a whole new shelf named after the page
 * title, so shelves like "Basic Usage | Better Auth" piled up and showed as
 * filter tabs. Fold those one-tab, title-named shelves into Later (no tab is
 * lost; the old shelf becomes a tombstone so sync deletes it too).
 */
async function foldTitleShelves() {
  const now = new Date().toISOString();
  await mutateGroups((groups) => {
    const junk = groups.filter(
      (g) => !g.deleted && g.id !== LATER_SHELF_ID && g.tabs.length === 1 && (g.name === g.tabs[0].title || g.name === "Untitled")
    );
    if (!junk.length) return groups;
    if (!groups.some((g) => g.id === LATER_SHELF_ID)) {
      groups = [{ id: LATER_SHELF_ID, name: "Later", pinned: true, tabs: [], createdAt: now, updatedAt: now, dirty: true }, ...groups];
    }
    const junkIds = new Set(junk.map((g) => g.id));
    return groups.map((g) => {
      if (junkIds.has(g.id)) return { ...g, tabs: [], deleted: true, updatedAt: now, dirty: true };
      if (g.id !== LATER_SHELF_ID) return g;
      const have = new Set(g.tabs.map((t) => t.url));
      const extra = junk.map((j) => j.tabs[0]).filter((t) => t && t.url && !have.has(t.url) && have.add(t.url));
      const tabs = [...g.tabs, ...extra].map((t, i) => ({ ...t, position: i }));
      return { ...g, deleted: false, tabs, updatedAt: now, dirty: true };
    });
  });
}

// ------------------------------------------------------------------ helpers

async function openShelf() {
  const url = chrome.runtime.getURL("index.html");
  const [existing] = await chrome.tabs.query({ url: `${url}*` });
  if (existing && existing.id != null) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url, active: true });
  }
}

function flashBadge(text, color) {
  try {
    chrome.action.setBadgeBackgroundColor({ color });
    chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
  } catch (_) {}
}

function toTabData(t, i) {
  return { url: t.url, title: t.title || t.url, favIconUrl: t.favIconUrl || null, position: i };
}

/** Serialised read-modify-write of tabGroups (mirrors src/lib/api.ts mutateGroups). */
let writeChain = Promise.resolve();
function mutateGroups(fn) {
  const run = writeChain.then(async () => {
    const { tabGroups = [] } = await chrome.storage.local.get("tabGroups");
    const next = fn(Array.isArray(tabGroups) ? tabGroups : []);
    await chrome.storage.local.set({ tabGroups: next });
    return next;
  });
  writeChain = run.catch(() => {});
  return run;
}

async function saveTabToLater(tab, opts = {}) {
  if (!tab.url || INTERNAL.test(tab.url)) return;
  const now = new Date().toISOString();
  await mutateGroups((groups) => {
    if (!groups.some((g) => g.id === LATER_SHELF_ID)) {
      groups = [{ id: LATER_SHELF_ID, name: "Later", pinned: true, tabs: [], createdAt: now, updatedAt: now, dirty: true }, ...groups];
    }
    return groups.map((g) => {
      if (g.id !== LATER_SHELF_ID) return g;
      const tabs = g.tabs.some((t) => t.url === tab.url) ? g.tabs : [...g.tabs, toTabData(tab, g.tabs.length)];
      return { ...g, deleted: false, tabs, updatedAt: now, dirty: true };
    });
  });
  flashBadge("+1", "#1C1A27");
  let close = opts.close;
  if (close === undefined) close = (await chrome.storage.local.get("closeOnPark")).closeOnPark === true;
  if (close && tab.id != null) {
    // closing a window's last tab would close the window, so open the shelf first
    const siblings = await chrome.tabs.query({ windowId: tab.windowId });
    if (siblings.length === 1) await openShelf();
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
  pushSyncQueue().catch(recordSyncError);
}

async function saveWindow(windowId, { close }) {
  const tabs = (await chrome.tabs.query({ windowId })).filter((t) => t.url && !INTERNAL.test(t.url));
  if (!tabs.length) return;
  const now = new Date().toISOString();
  const seen = new Set();
  const unique = tabs.filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true)));
  const label = new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const group = {
    id: crypto.randomUUID(),
    name: `Window · ${label}`,
    pinned: false,
    tabs: unique.map(toTabData),
    createdAt: now,
    updatedAt: now,
    dirty: true,
  };
  await mutateGroups((groups) => [group, ...groups]);
  flashBadge(String(unique.length), "#1C1A27");
  // Open the shelf first so closing the window never leaves the user with nothing.
  await openShelf();
  if (close) await chrome.tabs.remove(tabs.map((t) => t.id)).catch(() => {});
  pushSyncQueue().catch(recordSyncError);
}

// ------------------------------------------------------------------ auth

function detectPlatform() {
  if (navigator.brave) return "brave";
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "edge";
  if (ua.includes("OPR/")) return "opera";
  return "chrome";
}

function removeCachedGoogleToken(token) {
  return new Promise((resolve) => {
    if (!token || !chrome.identity || !chrome.identity.removeCachedAuthToken) return resolve();
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

function clearAllCachedGoogleTokens() {
  return new Promise((resolve) => {
    if (chrome.identity && chrome.identity.clearAllCachedAuthTokens) chrome.identity.clearAllCachedAuthTokens(() => resolve());
    else resolve();
  });
}

async function recordSyncError(err) {
  const message = err && err.message ? err.message : String(err);
  console.error("[sync]", message);
  try {
    await chrome.storage.local.set({ lastSyncError: message });
  } catch (_) {}
}

function describeFetchFailure(err) {
  return new Error(
    `Can't reach the sync server at ${API_BASE_URL}. Start it with "npm run server" ` +
      `(or check API_BASE_URL). Your tabs stay safe on this device. (${err && err.message ? err.message : err})`
  );
}

async function apiFetch(path, options) {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options);
  } catch (err) {
    throw describeFetchFailure(err);
  }
}

async function completeBackendAuth(payload) {
  const platform = detectPlatform();
  const res = await apiFetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, deviceName: `${platform} on ${navigator.platform}`, platform }),
  });
  if (!res.ok) {
    let message = "";
    try {
      message = (await res.json()).message || "";
    } catch (_) {}
    throw new Error(`Sync server refused sign-in (${res.status}): ${message || res.statusText}`);
  }
  const data = await res.json();
  await chrome.storage.local.set({
    authToken: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
    deviceId: data.deviceId,
    lastSyncedAt: null,
    lastSyncError: null,
    googleAccessToken: payload.accessToken || null,
  });
  fullSync().catch(recordSyncError);
  return data;
}

/**
 * Finishes sign-in after the PAGE obtained proof of identity:
 *  - { accessToken } from chrome.identity.getAuthToken (Chrome Extension client), or
 *  - { code, codeVerifier, redirectUri } from launchWebAuthFlow (Web client + PKCE).
 */
async function loginWithGoogleCredential(request) {
  if (typeof request.accessToken === "string" && request.accessToken) {
    try {
      return await completeBackendAuth({ accessToken: request.accessToken });
    } catch (err) {
      await removeCachedGoogleToken(request.accessToken);
      throw err;
    }
  }
  if (typeof request.code === "string" && typeof request.codeVerifier === "string" && typeof request.redirectUri === "string") {
    return completeBackendAuth({ code: request.code, codeVerifier: request.codeVerifier, redirectUri: request.redirectUri });
  }
  throw new Error("Sign-in must start from the TooManyTabs page.");
}

async function logout() {
  const { authToken, googleAccessToken } = await chrome.storage.local.get(["authToken", "googleAccessToken"]);
  if (authToken) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    }).catch(() => {});
  }
  await removeCachedGoogleToken(googleAccessToken);
  await clearAllCachedGoogleTokens();
  await chrome.storage.local.remove([
    "authToken",
    "refreshToken",
    "user",
    "deviceId",
    "lastSyncedAt",
    "lastSyncError",
    "googleAccessToken",
  ]);
}

async function authedFetch(path, options = {}) {
  const { authToken, refreshToken } = await chrome.storage.local.get(["authToken", "refreshToken"]);
  if (!authToken) throw new Error("Not signed in");
  const doFetch = (token) =>
    apiFetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  let res = await doFetch(authToken);
  if (res.status === 401 && refreshToken) {
    const refreshRes = await apiFetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshRes.ok) {
      await logout();
      throw new Error("Your session expired. Sign in again to keep syncing.");
    }
    const { token } = await refreshRes.json();
    await chrome.storage.local.set({ authToken: token });
    res = await doFetch(token);
  }
  return res;
}

// ------------------------------------------------------------------ sync
// Optimistic concurrency: each local group remembers the server `version` it
// was based on. Pushing an edit made on an older version is a conflict; the
// server returns its copy and we merge (union of tabs) instead of dropping
// either side, then push the merge.

function toLocalShape(remote) {
  return {
    id: remote.id,
    name: remote.name,
    pinned: !!remote.pinned,
    tabs: remote.tabs || [],
    createdAt: remote.createdAt || remote.updatedAt,
    updatedAt: remote.updatedAt,
    deleted: !!remote.deleted,
    dirty: false,
    version: remote.version,
  };
}

function mergeConflict(local, remote) {
  if (remote.deleted || local.deleted) return toLocalShape(remote);
  const seen = new Set();
  const tabs = [...(remote.tabs || []), ...(local.tabs || [])]
    .filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true)))
    .map((t, i) => ({ ...t, position: i }));
  const localNewer = new Date(local.updatedAt) > new Date(remote.updatedAt);
  return {
    ...toLocalShape(remote),
    name: localNewer ? local.name : remote.name,
    pinned: localNewer ? local.pinned : !!remote.pinned,
    tabs,
    updatedAt: new Date().toISOString(),
    dirty: true,
  };
}

let syncing = null;
function fullSync() {
  // Coalesce overlapping triggers (alarm, page, push) into one run.
  if (!syncing) {
    syncing = (async () => {
      await pushSyncQueue();
      await pullSyncChanges();
      await pushSyncQueue(); // push anything a conflict merge produced
      await chrome.storage.local.set({ lastSyncError: null });
    })().finally(() => {
      syncing = null;
    });
  }
  return syncing;
}

async function pushSyncQueue() {
  const { authToken, tabGroups = [] } = await chrome.storage.local.get(["authToken", "tabGroups"]);
  if (!authToken) return;
  const dirty = tabGroups.filter((g) => g.dirty);
  if (!dirty.length) return;
  const sent = new Map(dirty.map((g) => [g.id, g.updatedAt]));

  const res = await authedFetch("/sync/push", {
    method: "POST",
    body: JSON.stringify({
      groups: dirty.map((g) => ({
        id: g.id,
        name: g.name,
        pinned: !!g.pinned,
        deleted: !!g.deleted,
        updatedAt: g.updatedAt,
        baseVersion: typeof g.version === "number" ? g.version : null,
        tabs: g.tabs,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Sync push failed (${res.status}): ${await res.text()}`);
  const { accepted = [], conflicts = [], versions = {} } = await res.json();
  const acceptedSet = new Set(accepted);
  const conflictById = new Map(conflicts.map((c) => [c.id, c]));

  // Re-read: the user may have edited while the request was in flight.
  await mutateGroups((current) =>
    current
      .map((g) => {
        const unchanged = sent.get(g.id) === g.updatedAt;
        if (acceptedSet.has(g.id)) {
          const version = versions[g.id] ? versions[g.id] : g.version;
          return unchanged ? { ...g, dirty: false, version } : { ...g, version };
        }
        if (conflictById.has(g.id)) return mergeConflict(g, conflictById.get(g.id));
        return g;
      })
      // a tombstone can go once the server has it
      .filter((g) => !(g.deleted && !g.dirty))
  );
}

async function pullSyncChanges() {
  const { authToken, lastSyncedAt } = await chrome.storage.local.get(["authToken", "lastSyncedAt"]);
  if (!authToken) return;
  const since = lastSyncedAt || "1970-01-01T00:00:00.000Z";
  const res = await authedFetch(`/sync/pull?since=${encodeURIComponent(since)}`);
  if (!res.ok) throw new Error(`Sync pull failed (${res.status}): ${await res.text()}`);
  const { serverTime, groups: remoteGroups = [] } = await res.json();

  await mutateGroups((current) => {
    const byId = new Map(current.map((g) => [g.id, g]));
    for (const remote of remoteGroups) {
      const local = byId.get(remote.id);
      if (local && local.dirty) {
        // A local edit is pending: merge if the server moved on, otherwise our push wins.
        if (typeof local.version !== "number" || remote.version > local.version) byId.set(remote.id, mergeConflict(local, remote));
        continue;
      }
      if (remote.deleted) byId.delete(remote.id);
      else byId.set(remote.id, toLocalShape(remote));
    }
    return [...byId.values()];
  });
  await chrome.storage.local.set({ lastSyncedAt: serverTime });
}

// ------------------------------------------------------------------ messages

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Only our own pages may drive the worker.
  if (sender.id !== chrome.runtime.id) return false;
  const reply = (p) =>
    p
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err && err.message ? err.message : String(err) }));

  switch (request && request.action) {
    case "googleLogin":
      reply(loginWithGoogleCredential(request));
      return true;
    case "logout":
      reply(logout());
      return true;
    case "manualSync":
      reply(fullSync());
      return true;
    case "pushDirty":
      reply(pushSyncQueue().catch(recordSyncError));
      return true;
    default:
      return false;
  }
});
