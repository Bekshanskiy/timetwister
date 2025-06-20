// Use the comprehensive list of timezones supported by the browser.
const timezones = Intl.supportedValuesOf('timeZone');

const timezoneDropdown = document.getElementById('timezoneDropdown');
const enableToggle = document.getElementById('enableToggle');
const saveBtn = document.getElementById('saveBtn');
const currentTimezoneDisplay = document.getElementById('currentTimezoneDisplay');
const popupTimezoneSearch = document.getElementById('popupTimezoneSearch');
const popupClearSearchBtn = document.getElementById('popupClearSearchBtn');

let selectedTimezone = 'UTC';
let favoriteTimezones = [];
let siteTimezone = null;
let defaultTimezone = 'UTC';
let popupTimezoneFilter = '';

function renderDropdown(filter = '') {
  timezoneDropdown.innerHTML = '';
  const lowerCaseFilter = filter.toLowerCase().replace(/_/g, ' ');
  const filtered = timezones.filter(tz => tz.toLowerCase().replace(/_/g, ' ').includes(lowerCaseFilter));
  const sorted = [
    ...favoriteTimezones.filter(tz => filtered.includes(tz)),
    ...filtered.filter(tz => !favoriteTimezones.includes(tz))
  ];
  for (const tz of sorted) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.cursor = 'pointer';
    row.style.padding = '2px 12px';
    if (tz === selectedTimezone) {
      row.style.background = '#e0e0e0';
      row.style.fontWeight = 'bold';
    }
    // Timezone label
    const label = document.createElement('span');
    label.textContent = tz;
    label.style.flex = '1';
    label.addEventListener('click', () => {
      selectedTimezone = tz;
      renderDropdown(filter);
    });
    // Star icon (right side)
    const star = document.createElement('span');
    star.textContent = favoriteTimezones.includes(tz) ? '★' : '☆';
    star.style.marginLeft = '8px';
    star.style.color = favoriteTimezones.includes(tz) ? '#f5b301' : '#888';
    star.style.fontSize = '16px';
    star.style.userSelect = 'none';
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(tz);
    });
    row.appendChild(label);
    row.appendChild(star);
    timezoneDropdown.appendChild(row);
  }
}

function toggleFavorite(tz) {
  if (favoriteTimezones.includes(tz)) {
    favoriteTimezones = favoriteTimezones.filter(fav => fav !== tz);
  } else {
    favoriteTimezones.push(tz);
  }
  chrome.storage.sync.set({ favoriteTimezones });
  renderDropdown(popupTimezoneFilter);
}

function getCurrentTabUrl(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url).origin;
    callback(url, tabs[0].id);
  });
}

// Load favorites and current site setting
chrome.storage.sync.get(['favoriteTimezones'], (result) => {
  favoriteTimezones = result.favoriteTimezones || [];
  getCurrentTabUrl((url, tabId) => {
    chrome.storage.sync.get([url], (siteResult) => {
      if (siteResult[url]) {
        enableToggle.checked = true;
        selectedTimezone = siteResult[url];
        siteTimezone = siteResult[url];
      } else {
        enableToggle.checked = false;
        selectedTimezone = 'UTC';
        siteTimezone = null;
      }
      renderDropdown();
      renderCurrentTimezoneDisplay();
    });
  });
});

enableToggle.addEventListener('change', () => {
  getCurrentTabUrl((url, tabId) => {
    if (!enableToggle.checked) {
      chrome.storage.sync.remove([url], () => {
        chrome.runtime.sendMessage({ type: 'applyTimezone', tabId: tabId, timezone: null }, () => {
          chrome.tabs.reload(tabId);
        });
        siteTimezone = null;
        renderCurrentTimezoneDisplay();
      });
    }
  });
});

saveBtn.addEventListener('click', () => {
  getCurrentTabUrl((url, tabId) => {
    if (enableToggle.checked) {
      chrome.storage.sync.set({ [url]: selectedTimezone }, () => {
        chrome.runtime.sendMessage({ type: 'applyTimezone', tabId: tabId, timezone: selectedTimezone }, () => {
          chrome.tabs.reload(tabId);
          window.close();
        });
      });
    } else {
      window.close();
    }
  });
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function renderCurrentTimezoneDisplay() {
  if (enableToggle.checked && siteTimezone) {
    currentTimezoneDisplay.textContent = siteTimezone;
  } else {
    // Show default timezone if no site timezone is set
    chrome.storage.sync.get(['defaultTimezone'], (result) => {
      defaultTimezone = result.defaultTimezone || 'UTC';
      currentTimezoneDisplay.textContent = defaultTimezone;
    });
  }
}

popupTimezoneSearch.addEventListener('input', () => {
  popupTimezoneFilter = popupTimezoneSearch.value;
  renderDropdown(popupTimezoneFilter);
  popupClearSearchBtn.style.display = popupTimezoneFilter ? 'block' : 'none';
});

popupClearSearchBtn.addEventListener('click', () => {
  popupTimezoneSearch.value = '';
  popupTimezoneFilter = '';
  renderDropdown();
  popupClearSearchBtn.style.display = 'none';
});