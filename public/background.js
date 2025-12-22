console.log("BACKGROUND SERVICE WORKER LOADED");

// ==========================
// CONTEXT MENUS
// ==========================
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "display-tabs",
    title: "Display TooManyTabs",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "save-current-tabs",
    title: "Save All Tabs",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "save-this-tab",
    title: "Save This Tab",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "display-tabs") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html"),
      active: true,
    });
  } else if (info.menuItemId === "save-current-tabs") {
    saveAllCurrentTabs();
  } else if (info.menuItemId === "save-this-tab") {
    if (tab && tab.url && tab.title) {
      saveSingleTab(tab);
    }
  }
});

// ==========================
// TAB SAVING (UNCHANGED LOGIC)
// ==========================
async function saveAllCurrentTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    const formattedTabs = tabs
      .filter(
        (tab) =>
          tab.url &&
          !tab.url.startsWith("chrome://") &&
          !tab.url.startsWith("chrome-extension://")
      )
      .map((tab) => ({
        id: String(tab.id),
        url: tab.url,
        title: tab.title || "Untitled",
        favIconUrl: tab.favIconUrl,
        timestamp: Date.now(),
      }));

    if (formattedTabs.length === 0) return;

    const { savedSessions = [] } = await chrome.storage.local.get("savedSessions");

    const newSession = {
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      tabs: formattedTabs,
    };

    const updatedSessions = [newSession, ...savedSessions];
    await chrome.storage.local.set({ savedSessions: updatedSessions });

    chrome.tabs.remove(formattedTabs.map((t) => Number(t.id)));

    chrome.action.setBadgeText({ text: String(updatedSessions.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
  } catch (err) {
    console.error("Error saving tabs:", err);
  }
}

async function saveSingleTab(tab) {
  try {
    const formattedTab = {
      id: String(tab.id),
      url: tab.url,
      title: tab.title || "Untitled",
      favIconUrl: tab.favIconUrl,
      timestamp: Date.now(),
    };

    const { savedSessions = [] } = await chrome.storage.local.get("savedSessions");

    const newSession = {
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      tabs: [formattedTab],
    };

    const updatedSessions = [newSession, ...savedSessions];
    await chrome.storage.local.set({ savedSessions: updatedSessions });

    chrome.tabs.remove(Number(formattedTab.id));
  } catch (err) {
    console.error("Error saving tab:", err);
  }
}

// ==========================
// GOOGLE LOGIN
// ==========================
async function handleGoogleLogin(loginId) {
  const API_BASE_URL = "http://localhost:3000";

  try {
    console.log("[BACKGROUND] Starting Google login, loginId:", loginId);

    // Get Google access token
    const accessToken = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error("[BACKGROUND] Chrome identity error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        if (!token) {
          console.error("[BACKGROUND] No access token received");
          reject(new Error("No access token received from Google"));
          return;
        }
        console.log("[BACKGROUND] Google access token received");
        resolve(token);
      });
    });

    console.log("[BACKGROUND] Sending auth request to backend...");

    // Send to backend
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    console.log("[BACKGROUND] Backend response status:", res.status);

    if (!res.ok) {
      let errorMessage = "Backend authentication failed";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
        console.error("[BACKGROUND] Backend error:", errorData);
      } catch (e) {
        const errorText = await res.text().catch(() => "Unknown error");
        console.error("[BACKGROUND] Backend error (text):", errorText);
        errorMessage = `Backend error: ${res.status} ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log("[BACKGROUND] Auth successful, storing result...");

    const timestamp = Date.now();

    // Store auth token and user
    await chrome.storage.local.set({
      authToken: data.token,
      user: data.user,
    });

    // Store result for polling
    await chrome.storage.local.set({
      googleLoginResult: {
        success: true,
        data: data,
        timestamp: timestamp,
        loginId: loginId,
      },
    });

    console.log("[BACKGROUND] Google login success, result stored at timestamp:", timestamp);
  } catch (err) {
    console.error("[BACKGROUND] Google login failed:", err);
    const errorMessage = err.message || "Login failed";
    const timestamp = Date.now();

    // Store error result for polling
    await chrome.storage.local.set({
      googleLoginResult: {
        success: false,
        error: errorMessage,
        timestamp: timestamp,
        loginId: loginId,
      },
    });

    console.log("[BACKGROUND] Error stored in storage at timestamp:", timestamp);
  }
}

// ==========================
// MESSAGE HANDLER
// ==========================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "googleLogin") {
    console.log("[BACKGROUND] Google login message received, loginId:", request.loginId);
    // Handle async operation - don't await, let it run
    handleGoogleLogin(request.loginId).catch((err) => {
      console.error("[BACKGROUND] Unhandled error in handleGoogleLogin:", err);
    });
    // Return true to indicate async response, but we're using storage instead
    return true;
  }

  if (request.action === "getAllTabs") {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs });
    });
    return true;
  }

  if (request.action === "closeTabs") {
    const tabIds = request.tabIds;
    chrome.tabs.remove(tabIds);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "restoreTabs") {
    const urls = request.urls;
    urls.forEach((url) => {
      chrome.tabs.create({ url });
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "restoreSingleTab") {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
    return true;
  }

  return false;
});
