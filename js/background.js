const version = "1.3";
let attachedTabs = {}; // Tracks which tabs we have attached to

// Enhanced error handling and logging
const logError = (message, error) => {
  console.error(`TimeTwister: ${message}`, error);
};

const logInfo = (message) => {
  console.log(`TimeTwister: ${message}`);
};

// Modern badge styling - clean icon-only approach
const updateBadge = (tabId, isActive) => {
  // Always clear badge text - we rely only on icon color for state indication
  chrome.action.setBadgeText({ tabId, text: '' });
};

// Icon state management - Automatic theme detection like Apple apps
const updateIcon = (tabId, isActive) => {
  // Always update icon with current theme
  updateIconForCurrentTheme(tabId);
};

// Automatic theme detection and icon updating
const updateIconForCurrentTheme = (tabId = null) => {
  const lightIcons = {
    "16": "/icons/icon-16_black.png",
    "32": "/icons/icon-32_black.png",
    "48": "/icons/icon-48_blue.png",
    "128": "/icons/icon-128_blue.png"
  };

  const darkIcons = {
    "16": "/icons/icon-16_white.png",
    "32": "/icons/icon-32_white.png",
    "48": "/icons/icon-48_blue.png",
    "128": "/icons/icon-128_blue.png"
  };

  // Inject a content script to detect the actual theme
  const detectThemeScript = `
    (() => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      chrome.runtime.sendMessage({type: 'themeDetected', isDark: isDark});
    })();
  `;

  // Try to inject into an active tab to detect theme
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: () => {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          chrome.runtime.sendMessage({type: 'themeDetected', isDark: isDark});
        }
      }).catch(() => {
        // Fallback if script injection fails, use last known theme
        chrome.storage.local.get('isDarkTheme', ({ isDarkTheme }) => {
          setIconTheme(tabId, !!isDarkTheme);
        });
      });
    } else {
      // Fallback for chrome:// pages, use last known theme
      chrome.storage.local.get('isDarkTheme', ({ isDarkTheme }) => {
        setIconTheme(tabId, !!isDarkTheme);
      });
    }
  });
};

// Set icon based on theme
const setIconTheme = (tabId, isDark) => {
  const lightIcons = {
    "16": "/icons/icon-16_black.png",
    "32": "/icons/icon-32_black.png",
    "48": "/icons/icon-48_blue.png",
    "128": "/icons/icon-128_blue.png"
  };

  const darkIcons = {
    "16": "/icons/icon-16_white.png",
    "32": "/icons/icon-32_white.png",
    "48": "/icons/icon-48_blue.png",
    "128": "/icons/icon-128_blue.png"
  };

  const iconSet = isDark ? darkIcons : lightIcons;

  if (tabId) {
    chrome.action.setIcon({ tabId, path: iconSet });
  } else {
    chrome.action.setIcon({ path: iconSet });
  }

  // Store the detected theme for fallback on restricted pages
  chrome.storage.local.set({ isDarkTheme: isDark });

  console.log(`Icon updated - dark mode: ${isDark}`);
};

// Combined update function for both badge and icon
const updateTabState = (tabId, isActive) => {
  updateBadge(tabId, isActive);
  updateIcon(tabId, isActive);
};

// This function enables or updates the timezone for a tab.
const enableOrUpdateTimezone = (tabId, timezone) => {
  if (!tabId) return;

  const isAttached = !!attachedTabs[tabId];

  if (!isAttached) {
    // If not attached, attach the debugger first.
    chrome.debugger.attach({ tabId }, version, () => {
      if (chrome.runtime.lastError) {
        // This can happen if devtools is already open on the tab, etc.
        logError(`Could not attach debugger to tab ${tabId}`, chrome.runtime.lastError.message);
        return;
      }
      attachedTabs[tabId] = true; // Mark as attached
      logInfo(`Debugger attached to tab ${tabId}`);

      // Now set the timezone.
      chrome.debugger.sendCommand({ tabId }, "Emulation.setTimezoneOverride", { timezoneId: timezone }, (result) => {
        if (chrome.runtime.lastError) {
          logError(`Failed to set timezone for tab ${tabId}`, chrome.runtime.lastError.message);
          return;
        }
        // After successfully setting timezone, update the icon with modern styling.
        updateTabState(tabId, true);
        logInfo(`Timezone ${timezone} applied to tab ${tabId}`);
      });
    });
  } else {
    // If already attached, just update the timezone.
    chrome.debugger.sendCommand({ tabId }, "Emulation.setTimezoneOverride", { timezoneId: timezone }, (result) => {
      if (chrome.runtime.lastError) {
        logError(`Failed to update timezone for tab ${tabId}`, chrome.runtime.lastError.message);
        return;
      }
      updateTabState(tabId, true);
      logInfo(`Timezone updated to ${timezone} for tab ${tabId}`);
    });
  }
};

// This function disables the timezone override and detaches.
const disableTimezone = (tabId) => {
  if (!tabId || !attachedTabs[tabId]) return;

  // Detach the debugger, which automatically clears the override.
  chrome.debugger.detach({ tabId }, () => {
    if (chrome.runtime.lastError) {
      logError(`Failed to detach debugger from tab ${tabId}`, chrome.runtime.lastError.message);
      return;
    }
    delete attachedTabs[tabId];
    // After detaching, clear the icon badge with modern styling.
    updateTabState(tabId, false);
    logInfo(`Timezone override disabled for tab ${tabId}`);
  });
};

// Enhanced message handling with theme detection and better error responses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'applyTimezone') {
    try {
      if (request.timezone) {
        enableOrUpdateTimezone(request.tabId, request.timezone);
      } else {
        disableTimezone(request.tabId);
      }
      sendResponse({ success: true, message: 'Timezone applied successfully' });
    } catch (error) {
      logError('Failed to apply timezone', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.type === 'themeDetected') {
    // Handle theme detection from content scripts
    setIconTheme(sender.tab?.id, request.isDark);
    sendResponse({ success: true });
  }
  return true;
});

// Enhanced tab update handling with better performance
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
    try {
      const url = new URL(tab.url).origin;
      chrome.storage.sync.get([url], (result) => {
        if (chrome.runtime.lastError) {
          logError('Failed to get storage data', chrome.runtime.lastError.message);
          return;
        }

        if (result[url]) {
          enableOrUpdateTimezone(tabId, result[url]);
        } else {
          // Only disable if we were previously attached
          if (attachedTabs[tabId]) {
            disableTimezone(tabId);
          }
        }
      });
    } catch (error) {
      logError('Failed to process tab update', error);
    }
  }
});

// Enhanced cleanup when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (attachedTabs[tabId]) {
    try {
      chrome.debugger.detach({ tabId }, () => {
        // Ignore errors on cleanup as tab is already closed
        delete attachedTabs[tabId];
        logInfo(`Cleaned up tab ${tabId}`);
      });
    } catch (error) {
      // Tab is already closed, just clean up our tracking
      delete attachedTabs[tabId];
    }
  }
});

// Handle debugger detach events (e.g., when DevTools is opened)
chrome.debugger.onDetach && chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId && attachedTabs[source.tabId]) {
    delete attachedTabs[source.tabId];
    updateTabState(source.tabId, false);
    logInfo(`Debugger detached from tab ${source.tabId}: ${reason}`);
  }
});

// Automatic theme detection and initialization - like Apple apps
const initializeAutoTheme = () => {
  // Detect theme automatically on startup
  updateIconForCurrentTheme();
  console.log('Auto theme detection initialized');
};

// Initialize extension with automatic theme detection
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started - auto-detecting theme');
  initializeAutoTheme();
});

// Set automatic theme detection when extension is installed/enabled
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed - auto-detecting theme');
  initializeAutoTheme();
});

// Auto-update icons when tab becomes active (re-detect theme)
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateIconForCurrentTheme(activeInfo.tabId);
});

// Auto-update icons when window focus changes (theme might have changed)
chrome.windows.onFocusChanged.addListener(() => {
  if (chrome.windows.WINDOW_ID_NONE) return;
  updateIconForCurrentTheme();
});