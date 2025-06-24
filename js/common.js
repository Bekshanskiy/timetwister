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
        if (tabs[0] && tabs[0].url.startsWith('http')) {
            resolve({
              url: new URL(tabs[0].url).origin,
              id: tabs[0].id,
            });
        } else {
            resolve(null);
        }
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
    // Note: The toLocaleString method for getting offset is not perfectly reliable but works for display.
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
    this.selectedTimezone = null;
    this.timeFormat = '12'; // Default to 12-hour
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this));
  }

  async loadSettings() {
    this.favoriteTimezones = await Storage.get('favoriteTimezones', []);
    this.timeFormat = await Storage.get('timeFormat', '12');
    this.notify();
  }

  async setTimeFormat(format) {
      this.timeFormat = format;
      await Storage.set('timeFormat', format);
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

    this.favoriteTimezones = favorites.sort();
    await Storage.set('favoriteTimezones', this.favoriteTimezones);
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
    searchWrapper.className = 'search-wrapper';

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'search-icon');
    icon.setAttribute('viewBox', '0 0 20 20');
    icon.setAttribute('fill', 'currentColor');
    icon.innerHTML = `<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />`;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = placeholder || 'Search...';

    searchInput.addEventListener('input', () => onSearch?.(searchInput.value));

    searchWrapper.appendChild(icon);
    searchWrapper.appendChild(searchInput);
    return searchWrapper;
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
    if(isSelected) row.classList.add('selected');

    row.addEventListener('click', () => onSelect(timezone));

    const main = document.createElement('div');
    main.className = 'list-row-main';

    const title = document.createElement('span');
    title.className = 'list-row-title';

    const subtitle = document.createElement('span');
    subtitle.className = 'list-row-subtitle';

    const parts = timezone.split('/');
    const mainPart = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    const regionPart = parts.length > 1 ? parts[0] : '';

    title.textContent = mainPart.replace(/_/g, ' ');
    subtitle.textContent = `${regionPart.replace(/_/g, ' ')}${showOffset ? ` • ${getUtcOffsetString(timezone)}` : ''}`;

    main.appendChild(title);
    main.appendChild(subtitle);
    row.appendChild(main);

    if (onToggleFavorite) {
        const actions = document.createElement('div');
        actions.className = 'list-row-actions';

        const star = document.createElement('span');
        star.className = `star list-row-action ${isFavorite ? 'fav' : 'notfav'}`;
        star.innerHTML = isFavorite ? '★' : '☆';
        star.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
        star.onclick = (e) => {
            e.stopPropagation();
            onToggleFavorite(timezone);
        };
        actions.appendChild(star);
        row.appendChild(actions);
    }


    return row;
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

  static createRemoveBtn(onClick) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-icon danger';
      removeBtn.title = 'Remove setting';
      removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;
      removeBtn.addEventListener('click', onClick);
      return removeBtn;
  }
}

// ^ TIMEZONE LIST COMPONENT ----------------------------------------------------------

class TimezoneList {
  constructor(container, state, options = {}) {
    this.container = container;
    this.state = state;
    this.options = {
      showOffset: false,
      emptyMessage: 'Nothing found',
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
    const lowerCaseFilter = this.filter.toLowerCase().replace(/[/_]/g, ' ');
    const filtered = this.state.allTimezones.filter(tz =>
      tz.toLowerCase().replace(/[/_]/g, ' ').includes(lowerCaseFilter)
    );

    const favorites = this.state.favoriteTimezones.filter(tz => filtered.includes(tz));
    const nonFavorites = filtered.filter(tz => !this.state.favoriteTimezones.includes(tz)).sort();

    return [...favorites, ...nonFavorites];
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

    const searchBar = ComponentBuilder.createSearchBar(
      'Search timezones...',
      (filter) => this.timezoneList.setFilter(filter)
    );

    const listContainer = document.createElement('div');
    listContainer.id = 'timezoneDropdown';

    this.container.appendChild(searchBar);
    this.container.appendChild(listContainer);

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
    this.isPickerVisible = false;
    this.clockInterval = null;
    this.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.elements = {};
    this.initialize();
  }

  async initialize() {
    this.loadElements();
    await this.state.loadSettings();
    await this.loadInitialData();
    this.setupEventListeners();
    this.setupTimezonePicker();
    this.updateUI();
  }

  loadElements() {
    this.elements = {
        body: document.body,
        statusText: document.getElementById('statusText'),
        currentTime: document.getElementById('currentTime'),
        currentTimezoneDisplay: document.getElementById('currentTimezoneDisplay'),
        currentTimezoneValue: document.getElementById('currentTimezoneValue'),
        timezonePickerContainer: document.getElementById('timezonePickerContainer'),
        disableBtn: document.getElementById('disableBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
    };
  }

  async loadInitialData() {
    this.tab = await TabUtils.getCurrentTab();
    if (!this.tab) {
        this.siteTimezone = null;
    } else {
        this.siteTimezone = await Storage.get(this.tab.url);
    }
    this.state.setSelectedTimezone(this.siteTimezone);
  }

  updateUI() {
    const isActive = !!this.siteTimezone;

    this.elements.body.classList.toggle('active', isActive);

    if (isActive) {
        this.elements.statusText.textContent = 'Timezone override is active';
    } else {
        this.elements.statusText.textContent = 'Using system timezone';
    }

    this.elements.currentTimezoneValue.textContent = this.siteTimezone || 'Not Set';
    this.elements.disableBtn.style.display = isActive ? 'inline-flex' : 'none';

    this.elements.timezonePickerContainer.style.display = this.isPickerVisible ? 'block' : 'none';
    this.elements.currentTimezoneDisplay.classList.toggle('picker-active', this.isPickerVisible);

    this.updateClock();
  }

  updateClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    const timezoneToDisplay = this.siteTimezone || this.localTimezone;
    const hour12 = this.state.timeFormat === '12';

    const update = () => {
      try {
        this.elements.currentTime.textContent = new Date().toLocaleTimeString('en-US', {
            timeZone: timezoneToDisplay,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: hour12
        });
      } catch(e) {
        this.elements.currentTime.textContent = 'Invalid Timezone';
      }
    };

    update();
    this.clockInterval = setInterval(update, 1000);
  }

  setupEventListeners() {
    this.elements.currentTimezoneDisplay.addEventListener('click', () => {
        if (!this.tab) return;
        this.isPickerVisible = !this.isPickerVisible;
        this.updateUI();
    });

    this.elements.disableBtn.addEventListener('click', async () => {
        if (!this.tab) return;
        this.siteTimezone = null;
        this.state.setSelectedTimezone(null);

        await Storage.remove(this.tab.url);
        await TabUtils.applyTimezoneToTab(this.tab.id, null);
        this.updateUI();
        TabUtils.reloadTab(this.tab.id);
        window.close();
    });

    this.elements.settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    this.state.subscribe(() => this.updateClock());
  }

  setupTimezonePicker() {
    this.picker = new TimezonePicker(
      this.elements.timezonePickerContainer,
      this.state,
      {
        showOffset: true,
        emptyMessage: 'No matching timezones found.',
        onSelect: async (timezone) => {
          if (!this.tab) return;
          this.siteTimezone = timezone;
          this.isPickerVisible = false;
          await Storage.set(this.tab.url, timezone);
          await TabUtils.applyTimezoneToTab(this.tab.id, timezone);
          this.updateUI();
          TabUtils.reloadTab(this.tab.id);
          window.close();
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
    this.loadElements();
    await this.state.loadSettings();
    this.setupEventListeners();
    this.setupComponents();

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if(namespace === 'sync') {
            if(changes.timeFormat) {
                this.state.timeFormat = changes.timeFormat.newValue;
            }
            this.renderSites();
        }
    });
    this.renderSites();
    this.renderSettings();
  }

  loadElements() {
    this.elements.sitesSearchContainer = document.getElementById('sitesSearchContainer');
    this.elements.sitesList = document.getElementById('sitesList');
    this.elements.timeFormatToggle = document.getElementById('timeFormatToggle');
    this.elements.footer = document.getElementById('optionsFooter');
  }

  renderSettings() {
      // Update the active button in the segmented control
      const buttons = this.elements.timeFormatToggle.querySelectorAll('button');
      buttons.forEach(button => {
          button.classList.toggle('active', button.dataset.value === this.state.timeFormat);
      });

      const manifest = chrome.runtime.getManifest();
      this.elements.footer.innerHTML = `TimeTwister v${manifest.version} by Bekshanskiy`;
  }

  setupEventListeners() {
      this.elements.timeFormatToggle.addEventListener('click', (e) => {
          const button = e.target.closest('button');
          if (button) {
              const newFormat = button.dataset.value;
              this.state.setTimeFormat(newFormat);
              this.renderSettings(); // Re-render to update the active class
          }
      });
  }

  setupComponents() {
    const searchBar = ComponentBuilder.createSearchBar(
      'Search configured sites...',
      (filter) => this.renderSites(filter)
    );
    this.elements.sitesSearchContainer.appendChild(searchBar);
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

    let siteKeys = Object.keys(this.sites).sort();

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      siteKeys = siteKeys.filter((site) =>
        site.toLowerCase().includes(lowerFilter)
      );
    }

    if (siteKeys.length === 0) {
      this.elements.sitesList.innerHTML = `
        <div class="empty-list-message">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A11.953 11.953 0 0112 13.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0021 12c0-3.866-2.59-7-6-7" />
            </svg>
            <h3>No sites configured</h3>
            <p>Use the popup to set a timezone for any website.</p>
        </div>`;
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

    const favicon = document.createElement('img');
    favicon.className = 'site-favicon';
    favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${site}`;
    favicon.onerror = () => { favicon.style.visibility = 'hidden'; }; // Hide if no favicon found

    const siteDetails = document.createElement('div');
    siteDetails.className = 'site-details';

    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    const siteLabel = document.createElement('span');
    siteLabel.className = 'site-url';
    siteLabel.textContent = site;
    const timezoneLabel = document.createElement('span');
    timezoneLabel.className = 'site-timezone';
    timezoneLabel.textContent = timezone;
    siteDetails.appendChild(siteLabel);
    siteDetails.appendChild(timezoneLabel);

    siteInfo.appendChild(favicon);
    siteInfo.appendChild(siteDetails);

    mainContent.appendChild(siteInfo);

    const actions = document.createElement('div');
    actions.className = 'site-actions';

    const timezoneSelect = ComponentBuilder.createTimezoneSelect(timezone, {
      className: 'timezone-select-small',
      includeNotSet: false,
    });

    timezoneSelect.addEventListener('change', async (event) => {
      const newTimezone = event.target.value;
      await Storage.set(site, newTimezone);
    });

    const removeBtn = ComponentBuilder.createRemoveBtn(async () => {
        await Storage.remove(site);
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
