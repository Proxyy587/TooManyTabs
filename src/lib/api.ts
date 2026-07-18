export interface TabData {
  url: string;
  title: string;
  favIconUrl?: string | null;
  position?: number;
}

export interface TabGroup {
  id: string;
  name: string;
  pinned: boolean;
  tabs: TabData[];
  updatedAt: string;
  deleted?: boolean;
  dirty?: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  picture?: string;
}

function storageGet<T extends Record<string, unknown>>(
  keys: string[]
): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result as T));
  });
}

function storageSet(data: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

function sendMessage<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response as T);
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/** Migrate old savedSessions → tabGroups once (guest data from earlier builds) */
export async function migrateLegacySessions(): Promise<void> {
  const result = await storageGet<{
    tabGroups?: TabGroup[];
    savedSessions?: Array<{
      id: string;
      timestamp: number;
      groupLabel?: string;
      tabs: Array<{ url: string; title: string; favIconUrl?: string }>;
    }>;
  }>(["tabGroups", "savedSessions"]);

  const existing = (result.tabGroups || []).filter((g) => !g.deleted);
  const legacy = result.savedSessions || [];
  if (legacy.length === 0) return;

  const migrated: TabGroup[] = legacy.map((s) => ({
    id: crypto.randomUUID(),
    name: s.groupLabel || `Session ${new Date(s.timestamp).toLocaleString()}`,
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

  await storageSet({
    tabGroups: [...migrated, ...existing],
    savedSessions: [],
  });
}

async function readGroups(): Promise<TabGroup[]> {
  await migrateLegacySessions();
  const { tabGroups = [] } = await storageGet<{ tabGroups?: TabGroup[] }>([
    "tabGroups",
  ]);
  return (tabGroups || []).filter((g) => !g.deleted);
}

async function writeGroups(groups: TabGroup[]): Promise<void> {
  await storageSet({ tabGroups: groups });
  // Best-effort sync if logged in — never blocks guest mode
  sendMessage({ action: "pushDirty" }).catch(() => {});
}

export async function googleLogin(): Promise<{
  token: string;
  refreshToken: string;
  deviceId: string;
  user: AuthUser;
}> {
  const response = await sendMessage<{
    success: boolean;
    data?: {
      token: string;
      refreshToken: string;
      deviceId: string;
      user: AuthUser;
    };
    error?: string;
  }>({ action: "googleLogin" });

  if (!response?.success || !response.data) {
    throw new Error(response?.error || "Login failed");
  }
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await sendMessage({ action: "logout" });
  } catch {
    await chrome.storage.local.remove([
      "authToken",
      "refreshToken",
      "user",
      "deviceId",
      "lastSyncedAt",
    ]);
  }
}

export async function getAuthState(): Promise<{
  loggedIn: boolean;
  user: AuthUser | null;
}> {
  try {
    const viaBg = await sendMessage<{ loggedIn: boolean; user: AuthUser | null }>({
      action: "getAuthState",
    });
    if (viaBg) return viaBg;
  } catch {
    // fall through to storage
  }
  const { authToken, user } = await storageGet<{
    authToken?: string;
    user?: AuthUser;
  }>(["authToken", "user"]);
  return { loggedIn: !!authToken, user: user || null };
}

export async function isAuthenticated(): Promise<boolean> {
  const state = await getAuthState();
  return state.loggedIn;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const state = await getAuthState();
  return state.user;
}

/** Always reads local storage — works fully offline / as guest */
export async function getGroups(): Promise<TabGroup[]> {
  return readGroups();
}

export async function saveTabsAsGroup(
  tabs: TabData[],
  name?: string
): Promise<TabGroup> {
  const groups = await readGroups();
  const newGroup: TabGroup = {
    id: crypto.randomUUID(),
    name: name || `Shelf ${new Date().toLocaleString()}`,
    pinned: false,
    tabs: tabs.map((t, i) => ({
      url: t.url,
      title: t.title || "Untitled",
      favIconUrl: t.favIconUrl || null,
      position: t.position ?? i,
    })),
    updatedAt: new Date().toISOString(),
    deleted: false,
    dirty: true,
  };
  await writeGroups([newGroup, ...groups]);
  return newGroup;
}

/** Append tabs into an existing folder/group */
export async function appendTabsToGroup(
  groupId: string,
  tabs: TabData[]
): Promise<TabGroup[]> {
  const groups = await readGroups();
  const updated = groups.map((g) => {
    if (g.id !== groupId) return g;
    const merged = [
      ...g.tabs,
      ...tabs.map((t, i) => ({
        url: t.url,
        title: t.title || "Untitled",
        favIconUrl: t.favIconUrl || null,
        position: g.tabs.length + i,
      })),
    ];
    return {
      ...g,
      tabs: merged,
      updatedAt: new Date().toISOString(),
      dirty: true,
    };
  });
  await writeGroups(updated);
  return updated;
}

/** Move a single tab from one group to another */
export async function moveTabToGroup(
  fromGroupId: string,
  tabIndex: number,
  toGroupId: string
): Promise<TabGroup[]> {
  const groups = await readGroups();
  const from = groups.find((g) => g.id === fromGroupId);
  if (!from || tabIndex < 0 || tabIndex >= from.tabs.length) return groups;
  const tab = from.tabs[tabIndex];
  if (!tab) return groups;

  const updated = groups
    .map((g) => {
      if (g.id === fromGroupId) {
        const nextTabs = g.tabs.filter((_, i) => i !== tabIndex);
        return {
          ...g,
          tabs: nextTabs.map((t, i) => ({ ...t, position: i })),
          updatedAt: new Date().toISOString(),
          dirty: true,
          deleted: nextTabs.length === 0 ? true : g.deleted,
        };
      }
      if (g.id === toGroupId) {
        return {
          ...g,
          tabs: [
            ...g.tabs,
            { ...tab, position: g.tabs.length },
          ],
          updatedAt: new Date().toISOString(),
          dirty: true,
        };
      }
      return g;
    })
    .filter((g) => !(g.deleted && g.tabs.length === 0));

  // Soft-delete empty source in storage for sync
  const withSoft = groups.map((g) => {
    if (g.id !== fromGroupId) {
      const target = updated.find((u) => u.id === g.id);
      return target || g;
    }
    const nextTabs = g.tabs.filter((_, i) => i !== tabIndex);
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
  }).map((g) => {
    if (g.id !== toGroupId) return g;
    const already = updated.find((u) => u.id === toGroupId);
    return already || g;
  });

  await storageSet({ tabGroups: withSoft });
  sendMessage({ action: "pushDirty" }).catch(() => {});
  return withSoft.filter((g) => !g.deleted);
}

/** Merge multiple groups into one named folder */
export async function mergeGroups(
  groupIds: string[],
  name: string
): Promise<TabGroup[]> {
  const groups = await readGroups();
  const toMerge = groups.filter((g) => groupIds.includes(g.id));
  if (toMerge.length === 0) return groups;

  const mergedTabs: TabData[] = [];
  toMerge.forEach((g) => {
    g.tabs.forEach((t) => mergedTabs.push({ ...t }));
  });

  const newGroup: TabGroup = {
    id: crypto.randomUUID(),
    name,
    pinned: toMerge.some((g) => g.pinned),
    tabs: mergedTabs.map((t, i) => ({ ...t, position: i })),
    updatedAt: new Date().toISOString(),
    deleted: false,
    dirty: true,
  };

  const idSet = new Set(groupIds);
  const rest = groups.map((g) =>
    idSet.has(g.id)
      ? { ...g, deleted: true, tabs: [], updatedAt: new Date().toISOString(), dirty: true }
      : g
  );

  await storageSet({ tabGroups: [newGroup, ...rest] });
  sendMessage({ action: "pushDirty" }).catch(() => {});
  return [newGroup, ...rest.filter((g) => !g.deleted)];
}

export function suggestDomainGroups(
  tabs: TabData[]
): Array<{ domain: string; tabs: TabData[] }> {
  const map = new Map<string, TabData[]>();
  for (const tab of tabs) {
    let domain = "other";
    try {
      domain = new URL(tab.url).hostname.replace(/^www\./, "");
    } catch {
      /* ignore */
    }
    const list = map.get(domain) || [];
    list.push(tab);
    map.set(domain, list);
  }
  return Array.from(map.entries())
    .map(([domain, domainTabs]) => ({ domain, tabs: domainTabs }))
    .sort((a, b) => b.tabs.length - a.tabs.length);
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const groups = await readGroups();
  await writeGroups(
    groups.map((g) =>
      g.id === groupId
        ? { ...g, name, updatedAt: new Date().toISOString(), dirty: true }
        : g
    )
  );
}

export async function togglePin(groupId: string): Promise<void> {
  const groups = await readGroups();
  await writeGroups(
    groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            pinned: !g.pinned,
            updatedAt: new Date().toISOString(),
            dirty: true,
          }
        : g
    )
  );
}

export async function deleteGroup(groupId: string): Promise<void> {
  const groups = await readGroups();
  const updated = groups.map((g) =>
    g.id === groupId
      ? { ...g, deleted: true, updatedAt: new Date().toISOString(), dirty: true }
      : g
  );
  // Keep soft-deleted until sync, but hide from UI by filtering on read
  await storageSet({ tabGroups: updated });
  sendMessage({ action: "pushDirty" }).catch(() => {});
}

export async function deleteTabFromGroup(
  groupId: string,
  tabIndex: number
): Promise<TabGroup[]> {
  const all = await storageGet<{ tabGroups?: TabGroup[] }>(["tabGroups"]);
  const groups = all.tabGroups || [];
  const updated = groups.map((g) => {
    if (g.id !== groupId) return g;
    const nextTabs = g.tabs.filter((_, i) => i !== tabIndex);
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
  await storageSet({ tabGroups: updated });
  sendMessage({ action: "pushDirty" }).catch(() => {});
  return updated.filter((g) => !g.deleted);
}

export async function restoreTabs(urls: string[]): Promise<void> {
  try {
    await sendMessage({ action: "restoreTabs", urls });
  } catch {
    for (const url of urls) {
      await chrome.tabs.create({ url });
    }
  }
}

export async function restoreSingleTab(url: string): Promise<void> {
  try {
    await sendMessage({ action: "restoreSingleTab", url });
  } catch {
    await chrome.tabs.create({ url });
  }
}

export async function closeTabs(tabIds: number[]): Promise<void> {
  try {
    await sendMessage({ action: "closeTabs", tabIds });
  } catch {
    await chrome.tabs.remove(tabIds);
  }
}

export async function manualSync(): Promise<TabGroup[]> {
  const response = await sendMessage<{
    success: boolean;
    groups?: TabGroup[];
    error?: string;
  }>({ action: "manualSync" });

  if (!response?.success) {
    throw new Error(response?.error || "Sync failed");
  }
  return response.groups || (await readGroups());
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let path = u.pathname;
    if (path.endsWith("/") && path.length > 1) path = path.slice(0, -1);
    u.pathname = path;
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function findDuplicateOpenTabs(
  tabs: Array<{ id: string; url: string }>
): Map<string, string[]> {
  const byUrl = new Map<string, string[]>();
  for (const tab of tabs) {
    const key = normalizeUrl(tab.url);
    const existing = byUrl.get(key) || [];
    existing.push(tab.id);
    byUrl.set(key, existing);
  }
  for (const [key, ids] of byUrl) {
    if (ids.length < 2) byUrl.delete(key);
  }
  return byUrl;
}
