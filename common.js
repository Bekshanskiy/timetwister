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

const timezoneState = new TimezoneState();

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
    this.state = timezoneState;
    this.tab = null;
    this.siteTimezone = null;
    this.elements = {};

    this.initialize();
  }

  async initialize() {
    this.loadElements();
    await this.state.loadFavorites(); // Make sure popup also loads the favorites
    await this.loadInitialData();
    this.setupEventListeners();
    this.setupTimezonePicker();
  }

  loadElements() {
    this.elements.currentTimezoneDisplay = document.getElementById('currentTimezoneDisplay');
    this.elements.enableToggle = document.getElementById('enableToggle');
    this.elements.saveBtn = document.getElementById('saveBtn');
    this.elements.settingsBtn = document.getElementById('settingsBtn');
    this.elements.timezonePickerContainer = document.getElementById('timezonePickerContainer');
    this.elements.settingsView = document.getElementById('settingsView');
  }

  async loadInitialData() {
    this.tab = await TabUtils.getCurrentTab();
    if (!this.tab) return;

    this.siteTimezone = await Storage.get(this.tab.url);

    if (this.siteTimezone) {
      this.state.setSelectedTimezone(this.siteTimezone);
      this.elements.enableToggle.checked = true;
    } else {
      this.state.setSelectedTimezone('UTC');
      this.elements.enableToggle.checked = false;
    }
    this.updateCurrentTimezoneDisplay();
  }

  async updateCurrentTimezoneDisplay() {
    this.elements.currentTimezoneDisplay.textContent = this.siteTimezone || 'Not Set';
  }

  setupEventListeners() {
    this.elements.enableToggle.addEventListener('change', async () => {
      if (!this.elements.enableToggle.checked) {
        await Storage.remove(this.tab.url);
        await TabUtils.applyTimezoneToTab(this.tab.id, null);
        TabUtils.reloadTab(this.tab.id);
        this.siteTimezone = null;
        this.updateCurrentTimezoneDisplay();
      }
    });

    this.elements.saveBtn.addEventListener('click', async () => {
      if (this.elements.enableToggle.checked) {
        await Storage.set(this.tab.url, this.state.selectedTimezone);
        await TabUtils.applyTimezoneToTab(
          this.tab.id,
          this.state.selectedTimezone
        );
        TabUtils.reloadTab(this.tab.id);
      }
      window.close();
    });

    this.elements.settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  setupTimezonePicker() {
    this.picker = new TimezonePicker(
      this.elements.timezonePickerContainer,
      this.state,
      {
        showOffset: true,
        emptyMessage: 'No timezones found.',
        onSelect: (timezone) => {
          this.state.setSelectedTimezone(timezone);
          this.elements.currentTimezoneDisplay.textContent = timezone;
          this.siteTimezone = timezone;
        }
      }
    );
  }
}

class OptionsHandler {
  constructor() {
    this.state = timezoneState;
    this.elements = {};
    this.sites = {};
    this.initialize();
  }

  async initialize() {
    await this.state.loadFavorites();
    this.loadElements();
    this.setupComponents();
    this.loadInitialData();
  }

  loadElements() {
    this.elements.timezonePickerContainer = document.getElementById('timezonePickerContainer');
    this.elements.sitesSearchContainer = document.getElementById('sitesSearchContainer');
    this.elements.sitesList = document.getElementById('sitesList');
  }

  async loadInitialData() {
    this.renderSites();
  }

  setupComponents() {
    this.setupSitesSearch();
    this.setupFavoritesPicker();
  }

  setupSitesSearch() {
    const searchBar = ComponentBuilder.createSearchBar(
      'Search for a site...',
      (filter) => this.renderSites(filter)
    );
    this.elements.sitesSearchContainer.appendChild(searchBar);
  }

  setupFavoritesPicker() {
    this.timezonePicker = new TimezonePicker(
      this.elements.timezonePickerContainer,
      this.state,
      {
        showOffset: true,
        emptyMessage: 'No favorite timezones selected.',
        onSelect: null,
      }
    );
  }

  async renderSites(filter = '') {
    this.elements.sitesList.innerHTML = '';
    const allData = await Storage.getAll();
    this.sites = {};
    Object.keys(allData).forEach((key) => {
      if (key.startsWith('http')) {
        this.sites[key] = allData[key];
      }
    });

    let siteKeys = Object.keys(this.sites);

    if (filter) {
      siteKeys = siteKeys.filter((site) =>
        site.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (siteKeys.length === 0) {
      this.elements.sitesList.innerHTML =
        '<div class="empty-list-message">No sites set.</div>';
      return;
    }

    for (const site of siteKeys) {
      const row = this.createSiteRow(site, this.sites[site]);
      this.elements.sitesList.appendChild(row);
    }
  }

  createSiteRow(site, timezone) {
    const row = document.createElement('div');
    row.className = 'list-row site-row';

    const mainContent = document.createElement('div');
    mainContent.className = 'list-row-main';

    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    const siteLabel = document.createElement('span');
    siteLabel.className = 'site-url';
    siteLabel.textContent = site;
    const timezoneLabel = document.createElement('span');
    timezoneLabel.className = 'site-timezone';
    timezoneLabel.textContent = timezone;
    siteInfo.appendChild(siteLabel);
    siteInfo.appendChild(timezoneLabel);

    mainContent.appendChild(siteInfo);

    const actions = document.createElement('div');
    actions.className = 'site-actions';

    const timezoneSelect = ComponentBuilder.createTimezoneSelect(timezone, {
      className: 'timezone-select-small',
      includeNotSet: true,
    });

    timezoneSelect.addEventListener('change', async (event) => {
      const newTimezone = event.target.value;
      if (newTimezone) {
        await Storage.set(site, newTimezone);
      } else {
        await Storage.remove(site);
      }
      this.renderSites(); // Re-render to reflect changes
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-icon';
    removeBtn.innerHTML = '&times;'; // A simple 'x' for remove
    removeBtn.title = 'Remove site setting';
    removeBtn.addEventListener('click', async () => {
      await Storage.remove(site);
      this.renderSites();
    });

    actions.appendChild(timezoneSelect);
    actions.appendChild(removeBtn);
    mainContent.appendChild(actions);
    row.appendChild(mainContent);
    return row;
  }
}

// ^ INITIALIZATION --------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('popup')) {
    new PopupHandler();
  } else if (document.body.classList.contains('options')) {
    new OptionsHandler();
  }
});