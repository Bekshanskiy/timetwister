// Use the comprehensive list of timezones supported by the browser.
const allTimezones = Intl.supportedValuesOf('timeZone');

const sitesList = document.getElementById('sitesList');
const sitesSearch = document.getElementById('sitesSearch');
const clearSitesSearchBtn = document.getElementById('clearSitesSearchBtn');
const favoritesList = document.getElementById('favoritesList');
const defaultTimezoneSelect = document.getElementById('defaultTimezone');
const backToPopup = document.getElementById('backToPopup');
const timezoneSearch = document.getElementById('timezoneSearch');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const restoreDefaultBtn = document.getElementById('restoreDefaultBtn');
const defaultOffset = document.getElementById('defaultOffset');

let favoriteTimezones = [];
let selectedDefaultTimezone = 'UTC';

function getUtcOffsetString(timezone) {
  try {
    const now = new Date();
    // Get a string representation of the date in the target timezone
    const tzDateString = now.toLocaleString('en-US', { timeZone: timezone });
    // Parse it back into a date object
    const tzDate = new Date(tzDateString);
    // Get a string representation for UTC
    const utcDateString = now.toLocaleString('en-US', { timeZone: 'UTC' });
    // Parse it back
    const utcDate = new Date(utcDateString);

    // Calculate the difference in hours
    const offsetHours = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

    if (isNaN(offsetHours)) return ''; // Return empty on error
    if (offsetHours === 0) return 'UTC±0';

    // Format the string, e.g., UTC+3, UTC-7
    return `UTC${offsetHours > 0 ? '+' : ''}${offsetHours}`;
  } catch (e) {
    console.error(`Could not get offset for ${timezone}`, e);
    return ''; // Return empty string on any error
  }
}

function renderSites(allSettings, filter = '') {
  let siteKeys = Object.keys(allSettings).filter(k => k.startsWith('http'));

  if (filter) {
    const lowerCaseFilter = filter.toLowerCase();
    siteKeys = siteKeys.filter(site => site.toLowerCase().includes(lowerCaseFilter));
  }

  sitesList.innerHTML = '';
  if (siteKeys.length === 0) {
    sitesList.textContent = 'No sites set.';
  } else {
    for (const site of siteKeys) {
      const row = document.createElement('div');
      row.className = 'list-row';

      const mainContent = document.createElement('div');
      mainContent.className = 'list-row-main';
      const urlSpan = document.createElement('span');
      urlSpan.textContent = site;
      urlSpan.style.flex = '1';
      urlSpan.style.whiteSpace = 'nowrap';
      urlSpan.style.overflow = 'hidden';
      urlSpan.style.textOverflow = 'ellipsis';
      const timezoneSelect = document.createElement('select');
      timezoneSelect.className = 'timezone-select';
      for (const tz of allTimezones) {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.textContent = tz;
        timezoneSelect.appendChild(opt);
      }
      timezoneSelect.value = allSettings[site];
      mainContent.appendChild(urlSpan);
      mainContent.appendChild(timezoneSelect);

      const offsetSpan = document.createElement('span');
      offsetSpan.className = 'list-row-offset';
      offsetSpan.textContent = getUtcOffsetString(timezoneSelect.value);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn list-row-action';
      removeBtn.textContent = '✕';
      removeBtn.onclick = () => {
        chrome.storage.sync.remove([site], () => renderSitesFromStorage());
      };

      timezoneSelect.addEventListener('change', () => {
        const newTimezone = timezoneSelect.value;
        offsetSpan.textContent = getUtcOffsetString(newTimezone);
        chrome.storage.sync.set({ [site]: newTimezone });
        chrome.tabs.query({ url: `${site}/*` }, (tabs) => {
          for (const tab of tabs) {
            chrome.runtime.sendMessage({ type: 'applyTimezone', tabId: tab.id, timezone: newTimezone });
          }
        });
      });

      row.appendChild(mainContent);
      row.appendChild(offsetSpan);
      row.appendChild(removeBtn);
      sitesList.appendChild(row);
    }
  }
}

function renderSitesFromStorage() {
  chrome.storage.sync.get(null, (allSettings) => {
    renderSites(allSettings, sitesSearch.value);
  });
}

function renderFavorites(filter = '') {
  favoritesList.innerHTML = '';
  const lowerCaseFilter = filter.toLowerCase().replace(/_/g, " ");
  const filteredTimezones = allTimezones.filter(tz => tz.toLowerCase().replace(/_/g, " ").includes(lowerCaseFilter));
  const sortedTimezones = [...filteredTimezones].sort((a, b) => {
    const aIsFav = favoriteTimezones.includes(a);
    const bIsFav = favoriteTimezones.includes(b);
    if (aIsFav && !bIsFav) return -1;
    if (!aIsFav && bIsFav) return 1;
    return a.localeCompare(b);
  });

  for (const tz of sortedTimezones) {
    const row = document.createElement('div');
    row.className = 'list-row';

    const mainContent = document.createElement('div');
    mainContent.className = 'list-row-main';
    const label = document.createElement('span');
    label.textContent = tz;
    label.style.flex = '1';
    mainContent.appendChild(label);

    const offsetSpan = document.createElement('span');
    offsetSpan.className = 'list-row-offset';
    offsetSpan.textContent = getUtcOffsetString(tz);

    const star = document.createElement('span');
    star.className = 'star list-row-action ' + (favoriteTimezones.includes(tz) ? 'fav' : 'notfav');
    star.textContent = favoriteTimezones.includes(tz) ? '★' : '☆';
    star.onclick = () => toggleFavorite(tz);

    row.appendChild(mainContent);
    row.appendChild(offsetSpan);
    row.appendChild(star);
    favoritesList.appendChild(row);
  }
}

function toggleFavorite(tz) {
  if (favoriteTimezones.includes(tz)) {
    favoriteTimezones = favoriteTimezones.filter(fav => fav !== tz);
  } else {
    favoriteTimezones.push(tz);
  }
  // Re-render the list with the current search filter preserved.
  renderFavorites(timezoneSearch.value);
  chrome.storage.sync.set({ favoriteTimezones });
}

function renderDefaultTimezone() {
  defaultTimezoneSelect.innerHTML = '';
  for (const tz of allTimezones) {
    const opt = document.createElement('option');
    opt.value = tz;
    opt.textContent = tz;
    if (selectedDefaultTimezone === tz) opt.selected = true;
    defaultTimezoneSelect.appendChild(opt);
  }
  // Update the offset display when the list is rendered.
  defaultOffset.textContent = getUtcOffsetString(selectedDefaultTimezone);
}

defaultTimezoneSelect.addEventListener('change', () => {
  selectedDefaultTimezone = defaultTimezoneSelect.value;
  // Also update the offset when the user makes a new selection.
  defaultOffset.textContent = getUtcOffsetString(selectedDefaultTimezone);
  chrome.storage.sync.set({ defaultTimezone: selectedDefaultTimezone });
});

sitesSearch.addEventListener('input', () => {
  renderSitesFromStorage();
  clearSitesSearchBtn.style.display = sitesSearch.value ? 'block' : 'none';
});

clearSitesSearchBtn.addEventListener('click', () => {
  sitesSearch.value = '';
  renderSitesFromStorage();
  clearSitesSearchBtn.style.display = 'none';
});

timezoneSearch.addEventListener('input', () => {
  renderFavorites(timezoneSearch.value);
  clearSearchBtn.style.display = timezoneSearch.value ? 'block' : 'none';
});

clearSearchBtn.addEventListener('click', () => {
  timezoneSearch.value = '';
  renderFavorites();
  clearSearchBtn.style.display = 'none';
});

restoreDefaultBtn.addEventListener('click', () => {
  // 1. Remove the saved default from storage.
  chrome.storage.sync.remove('defaultTimezone');
  // 2. Re-initialize the component to reflect the change.
  // This will cause it to fall back to the auto-detected timezone.
  initializeDefaults();
});

function initializeDefaults() {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  chrome.storage.sync.get(['defaultTimezone'], (result) => {
    selectedDefaultTimezone = result.defaultTimezone || detectedTimezone || 'UTC';
    if (!allTimezones.includes(selectedDefaultTimezone)) {
      selectedDefaultTimezone = 'UTC';
    }
    renderDefaultTimezone();
  });
}

function initialize() {
  chrome.storage.sync.get(['favoriteTimezones'], (result) => {
    favoriteTimezones = result.favoriteTimezones || [];
    renderFavorites();
  });
  initializeDefaults();
  renderSitesFromStorage();
}

initialize();