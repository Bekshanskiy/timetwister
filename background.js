const version = "1.3";
let attachedTabs = {}; // Tracks which tabs we have attached to

// Enhanced error handling and logging
const logError = (message, error) => {
  console.error(`TimeTwister: ${message}`, error);
};

const logInfo = (message) => {
  console.log(`TimeTwister: ${message}`);
};

// Modern badge styling
const updateBadge = (tabId, isActive) => {
  if (isActive) {
    chrome.action.setBadgeText({ tabId, text: '•' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#3b82f6' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
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
        updateBadge(tabId, true);
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
    updateBadge(tabId, false);
    logInfo(`Timezone override disabled for tab ${tabId}`);
  });
};

// Enhanced message handling with better error responses
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
    updateBadge(source.tabId, false);
    logInfo(`Debugger detached from tab ${source.tabId}: ${reason}`);
  }
});