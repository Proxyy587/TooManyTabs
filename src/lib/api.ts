const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], (result) => {
      resolve(result.authToken || null);
    });
  });
}

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as HeadersInit & { Authorization: string }).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    chrome.storage.local.remove(["authToken", "user"]);
    throw new Error("Authentication required");
  }

  return response;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

export async function googleLogin(): Promise<{
  token: string;
  user: { id: number; email: string; name?: string; picture?: string };
}> {
  const backendAvailable = await checkBackendHealth();
  if (!backendAvailable) {
    throw new Error("Backend server is not available. Please ensure the server is running on http://localhost:3000");
  }

  await chrome.storage.local.remove(['googleLoginResult']);

  return new Promise((resolve, reject) => {
    let resolved = false;
    const loginId = Date.now().toString();
    const startTime = Date.now();

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        chrome.storage.onChanged.removeListener(storageListener);
        clearInterval(pollInterval);
        reject(new Error("Login request timed out after 45 seconds. Please check the backend server is running and try again."));
      }
    }, 45000);

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (!resolved && areaName === 'local' && changes.googleLoginResult) {
        const result = changes.googleLoginResult.newValue;
        if (result && result.timestamp && result.timestamp >= startTime) {
          resolved = true;
          clearTimeout(timeout);
          clearInterval(pollInterval);
          chrome.storage.onChanged.removeListener(storageListener);
          
          chrome.storage.local.remove(['googleLoginResult']);
          
          if (result.success) {
            resolve(result.data);
          } else {
            reject(new Error(result.error || "Login failed"));
          }
        }
      }
    };

    let pollCount = 0;
    const pollInterval = setInterval(async () => {
      if (resolved) {
        clearInterval(pollInterval);
        return;
      }

      pollCount++;
      if (pollCount % 10 === 0) {
        console.log(`[API] Still polling for login result... (${pollCount * 0.5}s)`);
      }

      try {
        const stored = await chrome.storage.local.get(['googleLoginResult']);
        const result = stored.googleLoginResult;
        
        if (result && result.timestamp && result.timestamp >= startTime) {
          console.log('[API] Found login result via polling:', result.success ? 'success' : 'error');
          resolved = true;
          clearTimeout(timeout);
          clearInterval(pollInterval);
          chrome.storage.onChanged.removeListener(storageListener);
          
          await chrome.storage.local.remove(['googleLoginResult']);
          
          if (result.success) {
            resolve(result.data);
          } else {
            reject(new Error(result.error || "Login failed"));
          }
        }
      } catch (error) {
        console.error('[API] Error polling for login result:', error);
      }
      }, 500);

    chrome.storage.onChanged.addListener(storageListener);

    console.log('[API] Sending login message to background script, loginId:', loginId);
    
    try {
      chrome.runtime.sendMessage({ 
        action: "googleLogin",
        loginId: loginId 
      }, (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || '';
          if (errorMsg.includes('port') || errorMsg.includes('closed')) {
            console.log('[API] Message port closed (expected), using storage polling instead');
          } else {
            console.warn('[API] Error sending message:', chrome.runtime.lastError);
          }
        } else if (response) {
          console.log('[API] Received immediate response:', response);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            clearInterval(pollInterval);
            chrome.storage.onChanged.removeListener(storageListener);
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error || "Login failed"));
            }
          }
        } else {
          console.log('[API] No immediate response, using storage polling');
        }
      });
    } catch (error) {
      console.warn('[API] Exception sending message (will use polling):', error);
    }
  });
}

export async function saveTabsToBackend(
  tabs: Array<{ url: string; title: string; favIconUrl?: string }>,
  groupLabel?: string
): Promise<{ success: boolean; sessionId: number }> {
  const response = await apiRequest("/api/tabs/save", {
    method: "POST",
    body: JSON.stringify({ tabs, groupLabel }),
  });

  if (!response.ok) {
    throw new Error("Failed to save tabs to backend");
  }

  return response.json();
}

export async function loadSessionsFromBackend(): Promise<{
  success: boolean;
  sessions: Array<{
    id: string;
    timestamp: number;
    groupLabel?: string;
    tabs: Array<{
      id: string;
      url: string;
      title: string;
      favIconUrl?: string;
      timestamp: number;
    }>;
  }>;
}> {
  const response = await apiRequest("/api/tabs/sessions", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to load sessions from backend");
  }

  return response.json();
}

export async function deleteSessionFromBackend(
  sessionId: string
): Promise<{ success: boolean }> {
  const numericId = sessionId.replace("session-", "");
  const response = await apiRequest(`/api/tabs/sessions/${numericId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete session from backend");
  }

  return response.json();
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

export async function getCurrentUser(): Promise<{
  id: number;
  email: string;
  name?: string;
  picture?: string;
} | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["user"], (result) => {
      resolve(result.user || null);
    });
  });
}
