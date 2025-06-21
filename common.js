// ^ UTILITIES -------------------------------------------------------------------------

// Storage utilities with Promise-based API
const Storage = {
  async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key] || defaultValue);
      });
    });
  },

  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, resolve);
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, resolve);
    });
  },

  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.remove([key], resolve);
    });
  }
};

// Tab utilities
const TabUtils = {
  async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        resolve({
          url: new URL(tab.url).origin,
          id: tab.id,
          fullTab: tab
        });
      });
    });
  },

  async applyTimezoneToTab(tabId, timezone) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'applyTimezone',
        tabId,
        timezone
      }, resolve);
    });
  },

  async reloadTab(tabId) {
    chrome.tabs.reload(tabId);
  }
};

// Utility: Get UTC offset string for a timezone
function getUtcOffsetString(timezone) {
  try {
    if (!timezone) return '';
    const now = new Date();
    const tzDateString = now.toLocaleString("en-US", { timeZone: timezone });
    const tzDate = new Date(tzDateString);
    const utcDateString = now.toLocaleString("en-US", { timeZone: "UTC" });
    const utcDate = new Date(utcDateString);
    const offsetHours = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

    if (isNaN(offsetHours)) return "";
    if (offsetHours === 0) return "UTC±0";
    return `UTC${offsetHours > 0 ? "+" : ""}${offsetHours}`;
  } catch (e) {
    return "";
  }
}

// ^ STATE MANAGEMENT ------------------------------------------------------------------

class TimezoneState {
  constructor() {
    this.allTimezones = Intl.supportedValuesOf('timeZone');
    this.favoriteTimezones = [];
    this.selectedTimezone = 'UTC';
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this));
  }

  async loadFavorites() {
    this.favoriteTimezones = await Storage.get('favoriteTimezones', []);
    this.notify();
  }

  async toggleFavorite(timezone) {
    const favorites = [...this.favoriteTimezones];
    const index = favorites.indexOf(timezone);

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(timezone);
    }

    this.favoriteTimezones = favorites;
    await Storage.set('favoriteTimezones', favorites);
    this.notify();
  }

  setSelectedTimezone(timezone) {
    this.selectedTimezone = timezone;
    this.notify();
  }
}

// ^ COMPONENT BUILDERS ---------------------------------------------------------------

class ComponentBuilder {
  static createSearchBar(placeholder, onSearch) {
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'search-wrapper mb-6';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = placeholder || 'Search...';

    const clearBtn = document.createElement('span');
    clearBtn.className = 'clear-btn';
    clearBtn.innerHTML = '&times;';
    clearBtn.style.display = 'none';

    const handleInput = () => {
      const filter = searchInput.value;
      clearBtn.style.display = filter ? 'block' : 'none';
      onSearch?.(filter);
    };

    const handleClear = () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      onSearch?.('');
    };

    searchInput.addEventListener('input', handleInput);
    clearBtn.addEventListener('click', handleClear);

    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(clearBtn);

    return searchWrapper;
  }

  static createTimezoneSelect(selectedValue, options = {}) {
    const select = document.createElement('select');
    select.className = options.className || 'timezone-select';

    if (options.includeNotSet) {
      const notSetOption = document.createElement('option');
      notSetOption.value = '';
      notSetOption.textContent = 'Not set';
      select.appendChild(notSetOption);
    }

    const allTimezones = Intl.supportedValuesOf('timeZone');
    for (const tz of allTimezones) {
      const option = document.createElement('option');
      option.value = tz;
      option.textContent = tz;
      select.appendChild(option);
    }

    select.value = selectedValue || '';
    return select;
  }

  static createTimezoneListRow(timezone, options = {}) {
    const {
      isFavorite = false,
      isSelected = false,
      showOffset = false,
      onSelect,
      onToggleFavorite
    } = options;

    const row = document.createElement('div');
    row.className = 'list-row';

    if (isSelected) {
      row.style.background = '#e0e0e0';
      row.style.fontWeight = 'bold';
    }

    if (onSelect) {
      row.addEventListener('click', () => onSelect(timezone));
    }

    // Label
    const label = document.createElement('span');
    label.textContent = timezone;
    label.style.flex = '1';
    row.appendChild(label);

    // Offset
    if (showOffset) {
      const offset = document.createElement('span');
      offset.className = 'list-row-offset';
      offset.textContent = getUtcOffsetString(timezone);
      row.appendChild(offset);
    }

    // Star
    if (onToggleFavorite) {
      const star = document.createElement('span');
      star.className = `star list-row-action ${isFavorite ? 'fav' : 'notfav'}`;
      star.textContent = isFavorite ? '★' : '☆';
      star.onclick = (e) => {
        e.stopPropagation();
        onToggleFavorite(timezone);
      };
      row.appendChild(star);
    }

    return row;
  }
}

// ^ TIMEZONE LIST COMPONENT ----------------------------------------------------------

class TimezoneList {
  constructor(container, state, options = {}) {
    this.container = container;
    this.state = state;
    this.options = {
      showOffset: false,
      emptyMessage: 'No timezones found.',
      onSelect: null,
      ...options
    };
    this.filter = '';

    this.unsubscribe = state.subscribe(() => this.render());
    this.render();
  }

  setFilter(filter) {
    this.filter = filter;
    this.render();
  }

  getFilteredTimezones() {
    const lowerCaseFilter = this.filter.toLowerCase().replace(/_/g, ' ');
    const filtered = this.state.allTimezones.filter(tz =>
      tz.toLowerCase().replace(/_/g, ' ').includes(lowerCaseFilter)
    );

    // Sort: favorites first, then others
    return [
      ...this.state.favoriteTimezones.filter(tz => filtered.includes(tz)),
      ...filtered.filter(tz => !this.state.favoriteTimezones.includes(tz))
    ];
  }

  render() {
    this.container.innerHTML = '';
    const sortedTimezones = this.getFilteredTimezones();

    if (sortedTimezones.length === 0) {
      this.container.innerHTML = `<div class="empty-list-message">${this.options.emptyMessage}</div>`;
      return;
    }

    for (const tz of sortedTimezones) {
      const row = ComponentBuilder.createTimezoneListRow(tz, {
        isFavorite: this.state.favoriteTimezones.includes(tz),
        isSelected: tz === this.state.selectedTimezone,
        showOffset: this.options.showOffset,
        onSelect: this.options.onSelect,
        onToggleFavorite: (timezone) => this.state.toggleFavorite(timezone)
      });
      this.container.appendChild(row);
    }
  }

  destroy() {
    this.unsubscribe?.();
  }
}

// ^ TIMEZONE PICKER COMPONENT --------------------------------------------------------

class TimezonePicker {
  constructor(container, state, options = {}) {
    this.container = container;
    this.state = state;
    this.options = options;

    this.render();
  }

  render() {
    this.container.innerHTML = '';

    // Search bar
    const searchBar = ComponentBuilder.createSearchBar(
      'Search timezones...',
      (filter) => this.timezoneList.setFilter(filter)
    );

    // List container
    const listContainer = document.createElement('div');
    listContainer.id = 'timezoneDropdown';

    this.container.appendChild(searchBar);
    this.container.appendChild(listContainer);

    // Initialize timezone list
    this.timezoneList = new TimezoneList(listContainer, this.state, {
      ...this.options,
      onSelect: (timezone) => {
        this.state.setSelectedTimezone(timezone);
        this.options.onSelect?.(timezone);
      }
    });
  }

  destroy() {
    this.timezoneList?.destroy();
  }
}

// ^ PAGE HANDLERS --------------------------------------------------------------------

class PopupHandler {
  constructor() {
    this.state = new TimezoneState();
    this.siteTimezone = null;
  }

  async initialize() {
    this.state = new TimezoneState();
    this.loadElements();
    await this.loadInitialData();
    this.setupEventListeners();
    this.setupTimezonePicker();
  }

  loadElements() {
    this.currentTimezoneDisplay = document.getElementById(
      'currentTimezoneDisplay'
    );
    this.enableToggle = document.getElementById('enableToggle');
    this.saveBtn = document.getElementById('saveBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.timezonePickerContainer = document.getElementById(
      'timezonePickerContainer'
    );
  }

  async loadInitialData() {
    const tab = await TabUtils.getCurrentTab();
    this.tabUrl = tab.url;
    this.tabId = tab.id;

    await this.state.loadFavorites();

    const siteTimezone = await Storage.get(this.tabUrl);
    if (siteTimezone) {
      this.state.setSelectedTimezone(siteTimezone);
      this.enableToggle.checked = true;
    } else {
      this.state.setSelectedTimezone('UTC'); // Default to UTC if not set
      this.enableToggle.checked = false;
    }
    this.updateCurrentTimezoneDisplay();
  }

  async updateCurrentTimezoneDisplay() {
    const siteTimezone = await Storage.get(this.tabUrl);
    this.currentTimezoneDisplay.textContent = siteTimezone || 'Not Set';
  }

  setupEventListeners() {
    this.enableToggle.addEventListener('change', async () => {
      if (!this.enableToggle.checked) {
        const tab = await TabUtils.getCurrentTab();
        await Storage.remove(tab.url);
        await TabUtils.applyTimezoneToTab(tab.id, null);
        TabUtils.reloadTab(tab.id);
        this.siteTimezone = null;
        this.updateCurrentTimezoneDisplay();
      }
    });

    this.saveBtn.addEventListener('click', async () => {
      const tab = await TabUtils.getCurrentTab();

      if (this.enableToggle.checked) {
        await Storage.set(tab.url, this.state.selectedTimezone);
        await TabUtils.applyTimezoneToTab(tab.id, this.state.selectedTimezone);
        TabUtils.reloadTab(tab.id);
      }

      window.close();
    });

    this.settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  setupTimezonePicker() {
    this.picker = new TimezonePicker(this.timezonePickerContainer, this.state, {
      showOffset: true,
      emptyMessage: 'No timezones found.'
    });
  }
}

class OptionsHandler {
  constructor() {
    this.state = null;
    this.sitesList = null;
    this.timezonePicker = null;
    this.sitesSearchContainer = null;
  }

  async initialize() {
    this.state = new TimezoneState();
    this.loadElements();
    await this.loadInitialData();
    this.setupComponents();
  }

  loadElements() {
    this.sitesList = document.getElementById('sitesList');
    this.sitesSearchContainer = document.getElementById('sitesSearchContainer');
    this.timezonePickerContainer = document.getElementById(
      'timezonePickerContainer'
    );
  }

  async loadInitialData() {
    await this.state.loadFavorites();
    this.renderSites();
  }

  setupComponents() {
    this.setupSitesSearch();
    this.setupFavoritesPicker();
  }

  setupSitesSearch() {
    const searchBar = ComponentBuilder.createSearchBar(
      'Search sites...',
      (filter) => this.renderSites(filter)
    );
    this.sitesSearchContainer.appendChild(searchBar);
  }

  setupFavoritesPicker() {
    this.timezonePicker = new TimezonePicker(
      this.timezonePickerContainer,
      this.state,
      {
        showFavorites: true
      }
    );
  }

  async renderSites(filter = '') {
    this.sitesList.innerHTML = '';
    const allData = await Storage.getAll();
    let siteKeys = Object.keys(allData).filter(k => k.startsWith('http'));

    if (filter) {
      const lowerCaseFilter = filter.toLowerCase();
      siteKeys = siteKeys.filter(site =>
        site.toLowerCase().includes(lowerCaseFilter)
      );
    }

    if (siteKeys.length === 0) {
      this.sitesList.innerHTML = '<div class="empty-list-message">No sites set.</div>';
      return;
    }

    for (const site of siteKeys) {
      const row = this.createSiteRow(site, allData[site]);
      this.sitesList.appendChild(row);
    }
  }

  createSiteRow(site, timezone) {
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

    const timezoneSelect = ComponentBuilder.createTimezoneSelect(timezone);
    const offsetSpan = document.createElement('span');
    offsetSpan.className = 'list-row-offset';
    offsetSpan.textContent = getUtcOffsetString(timezone);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'clear-btn list-row-action';
    removeBtn.title = 'Remove site';
    removeBtn.textContent = '×';

    // Events
    timezoneSelect.addEventListener('change', async () => {
      const newTimezone = timezoneSelect.value;
      offsetSpan.textContent = getUtcOffsetString(newTimezone);
      await Storage.set(site, newTimezone);

      chrome.tabs.query({ url: `${site}/*` }, async (tabs) => {
        for (const tab of tabs) {
          await TabUtils.applyTimezoneToTab(tab.id, newTimezone);
        }
      });
    });

    removeBtn.addEventListener('click', async () => {
      await Storage.remove(site);
      this.renderSites();
    });

    mainContent.appendChild(urlSpan);
    mainContent.appendChild(timezoneSelect);
    row.appendChild(mainContent);
    row.appendChild(offsetSpan);
    row.appendChild(removeBtn);

    return row;
  }
}

// ^ INITIALIZATION -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const pageHandlers = {
    popup: PopupHandler,
    options: OptionsHandler
  };

  const pageType = document.body.classList.contains('popup') ? 'popup' : 'options';
  const HandlerClass = pageHandlers[pageType];

  if (HandlerClass) {
    const handler = new HandlerClass();
    handler.initialize().catch(console.error);
  }
});