# TimeTwister Chrome Extension

> **Smart timezone override for websites** - Modern, accurate, and stylish timezone management.

TimeTwister is a sophisticated browser extension that provides per-site timezone control with a beautiful, modern, and intuitive interface.

## Features

- **Per-site Timezone Settings:** Assign unique timezones to any website with precision.
- **Instant Timezone Switching:** Changes are applied immediately, and the tab reloads to reflect the new locale.
- **Live Clock:** See the current time in the selected timezone (or your system's local time) directly in the popup.
- **12/24-Hour Format:** Choose your preferred time format in the settings.
- **Favorite Timezones:** Star your most-used timezones to pin them to the top of the list for quick access.
- **Modern & Clean UI:** A polished and elegant interface designed for clarity and ease of use.
- **Accessible:** Full keyboard navigation and screen reader support.
- **Sync Across Devices:** Your site settings automatically sync via your Chrome account.
- **Centralized Management:** An options page to view and manage all your site-specific overrides in one place.


## Getting Started

### Installation

1.  **Clone or download** this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** in the top right.
4.  Click **"Load unpacked"** and select the extension directory.
5.  The TimeTwister icon will appear in your toolbar.

### Usage

1.  **Click the TimeTwister icon** in your browser toolbar to open the popup.
2.  By default, the popup shows that timezone override is inactive and displays your system's current time.
3.  To set a timezone for the current site, click the main display button (which initially says "Not Set").
4.  Use the polished search bar to find your desired timezone.
5.  **Click a timezone** from the list. The setting is saved instantly, and the tab will reload.
6.  The popup will now show the override is active and display the current time for the selected zone.
7.  To disable the override, click the **"Disable for this site"** button.

## Design & UI Philosophy

- **Clarity First:** The UI is designed to be self-explanatory, providing clear status indicators and intuitive controls.
- **Modern Aesthetics:** Uses a clean color palette, refined typography (Inter), and appropriate spacing.
- **Consistency:** The design language is consistent between the popup and the options page.
- **Visual Feedback:** Interactive elements provide clear hover and focus states.
- **Component-Based:** The UI is built with reusable components for maintainability.

## How It Works

TimeTwister uses Chrome's `debugger` API to override the browser's timezone for specific tabs. When you configure a timezone for a site:

1.  The extension attaches to the tab's debugging context.
2.  It applies the timezone override using `Emulation.setTimezoneOverride`.
3.  Your settings are saved to `chrome.storage.sync` to be persisted and synced across devices.
4.  The timezone is automatically reapplied on future visits to the site.

## Project Structure

```
timetwister/
├── manifest.json                   # Extension configuration
├── icons/                         # Chrome-accessible icons (flat structure)
│   ├── icon-*.png                 # Fallback icons (16, 32, 48, 128px)
│   ├── icon-*_black.png           # Light theme icons (black on light)
│   └── icon-*_white.png           # Dark theme icons (white on dark)
├── js/
│   ├── background.js              # Service worker with theme-aware icon logic
│   └── common.js                  # All popup & options logic (consolidated)
├── css/
│   └── common.css                 # All styles for popup & options (consolidated)
├── pages/
│   ├── popup.html                 # Main extension popup
│   └── options.html               # Settings page
└── README.md                      # This file
```

## Icon Management & Theme Support

TimeTwister features **automatic theme-aware icons** that adapt to your system's light/dark mode preference:

- **Light theme**: Uses black icons for optimal contrast on light backgrounds
- **Dark theme**: Uses white icons for optimal contrast on dark backgrounds
- **Automatic switching**: No manual toggle needed - icons switch based on `prefers-color-scheme`

### Icon Generation

Icons are automatically generated and managed for theme-aware display:

- **Light theme**: Uses black icons for optimal contrast on light backgrounds
- **Dark theme**: Uses white icons for optimal contrast on dark backgrounds
- **Automatic switching**: No manual toggle needed - icons switch based on `prefers-color-scheme`

All icon variants are stored in the `icons/` directory where Chrome can access them at runtime.

**Recent Changes**:
- Restructured to conventional Chrome extension layout with `js/`, `css/`, `pages/`, `icons/` folders
- Maintained consolidated `common.js` and `common.css` files for easier maintenance
- Fixed "Failed to fetch" errors by ensuring proper icon paths


## Contributing

We welcome contributions! Whether it's:

- Bug fixes
- New features
- UI improvements
- Documentation updates

Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
