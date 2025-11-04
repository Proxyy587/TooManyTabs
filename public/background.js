chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'display-tabs',
    title: 'Display TooManyTabs',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'save-current-tabs',
    title: 'Save All Tabs to TooManyTabs',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'save-this-tab',
    title: 'Save This Tab to TooManyTabs',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'display-tabs') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html'),
      active: true
    });
  } else if (info.menuItemId === 'save-current-tabs') {
    saveAllCurrentTabs();
  } else if (info.menuItemId === 'save-this-tab') {
    if (tab && tab.url && tab.title) {
      saveSingleTab(tab);
    }
  }
});

async function saveAllCurrentTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const formattedTabs = tabs
      .filter((tab) => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
      .map((tab) => ({
        id: String(tab.id),
        url: tab.url || '',
        title: tab.title || 'Untitled',
        favIconUrl: tab.favIconUrl,
        timestamp: Date.now(),
      }));

    if (formattedTabs.length === 0) {
      return;
    }

    const result = await chrome.storage.local.get(['savedSessions']);
    const existingSessions = result.savedSessions || [];

    const newSession = {
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      tabs: formattedTabs,
    };

    const updatedSessions = [newSession, ...existingSessions];
    await chrome.storage.local.set({ savedSessions: updatedSessions });

    const tabIds = formattedTabs.map((tab) => parseInt(tab.id));
    chrome.tabs.remove(tabIds);

    chrome.action.setBadgeText({ text: String(updatedSessions.length) });
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  } catch (error) {
    console.error('Error saving tabs:', error);
  }
}

async function saveSingleTab(tab) {
  try {
    const formattedTab = {
      id: String(tab.id),
      url: tab.url || '',
      title: tab.title || 'Untitled',
      favIconUrl: tab.favIconUrl,
      timestamp: Date.now(),
    };

    const result = await chrome.storage.local.get(['savedSessions']);
    const existingSessions = result.savedSessions || [];

    const newSession = {
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      tabs: [formattedTab],
    };

    const updatedSessions = [newSession, ...existingSessions];
    await chrome.storage.local.set({ savedSessions: updatedSessions });

    chrome.tabs.remove(parseInt(formattedTab.id));

    chrome.action.setBadgeText({ text: String(updatedSessions.length) });
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  } catch (error) {
    console.error('Error saving tab:', error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAllTabs') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs });
    });
    return true; 
  }

  if (request.action === 'closeTabs') {
    const tabIds = request.tabIds;
    chrome.tabs.remove(tabIds);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'restoreTabs') {
    const urls = request.urls;
    urls.forEach((url) => {
      chrome.tabs.create({ url });
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'restoreSingleTab') {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
    return true;
  }
});
