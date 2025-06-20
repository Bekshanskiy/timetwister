const version = "1.3";
let attachedTabs = {}; // Tracks which tabs we have attached to

// This function enables or updates the timezone for a tab.
const enableOrUpdateTimezone = (tabId, timezone) => {
  if (!tabId) return;

  const isAttached = !!attachedTabs[tabId];

  if (!isAttached) {
    // If not attached, attach the debugger first.
    chrome.debugger.attach({ tabId }, version, () => {
      if (chrome.runtime.lastError) {
        // This can happen if devtools is already open on the tab, etc.
        console.error(`TimeTwister: Could not attach debugger to tab ${tabId}.`, chrome.runtime.lastError.message);
        return;
      }
      attachedTabs[tabId] = true; // Mark as attached
      // Now set the timezone.
      chrome.debugger.sendCommand({ tabId }, "Emulation.setTimezoneOverride", { timezoneId: timezone }, () => {
        // After successfully setting timezone, update the icon.
        chrome.action.setBadgeText({ tabId: tabId, text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#0074D9' });
      });
    });
  } else {
    // If already attached, just update the timezone.
    chrome.debugger.sendCommand({ tabId }, "Emulation.setTimezoneOverride", { timezoneId: timezone });
  }
};

// This function disables the timezone override and detaches.
const disableTimezone = (tabId) => {
  if (!tabId || !attachedTabs[tabId]) return;

  // Detach the debugger, which automatically clears the override.
  chrome.debugger.detach({ tabId }, () => {
    delete attachedTabs[tabId];
    // After detaching, clear the icon badge.
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
  });
};

// Listen for messages from the popup to apply changes immediately.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'applyTimezone') {
    if (request.timezone) {
      enableOrUpdateTimezone(request.tabId, request.timezone);
    } else {
      disableTimezone(request.tabId);
    }
    sendResponse({ success: true });
  }
  return true;
});

// When a tab is updated (e.g., reloaded or navigated), re-apply the correct setting.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
    const url = new URL(tab.url).origin;
    chrome.storage.sync.get([url], (result) => {
      if (result[url]) {
        enableOrUpdateTimezone(tabId, result[url]);
      } else {
        disableTimezone(tabId);
      }
    });
  }
});

// Clean up when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (attachedTabs[tabId]) {
    disableTimezone(tabId);
  }
});