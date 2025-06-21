# TimeTwister Chrome Extension

TimeTwister is a simple but powerful browser extension that lets you change the timezone of your browser on a per-site basis.

## Features

- **Per-site timezone settings:** Assign a unique timezone to any website.
- **Dynamic timezone detection:** Automatically apply timezones based on rules.
- **Favorite timezones:** Quickly access your most-used timezones.
- **Easy-to-use interface:** A clean and intuitive UI for managing your settings.

## Getting Started

1.  **Installation:**
    -   Clone this repository or download the source code.
    -   Open Chrome and navigate to `chrome://extensions`.
    -   Enable "Developer mode".
    -   Click "Load unpacked" and select the extension's directory.

2.  **Usage:**
    -   Click the TimeTwister icon in your browser's toolbar.
    -   Select a timezone from the list to apply it to the current site.
    -   The selected timezone will be automatically applied whenever you visit that site.
    -   Use the options page to manage all your site-specific timezones and favorites.

## How It Works

The extension uses the `chrome.debugger` API to override the browser's timezone for specific tabs. When you set a timezone for a site, TimeTwister remembers your choice and applies it every time you visit a page on that domain.

The settings are synced across your devices using `chrome.storage.sync`.

## Contributing

Contributions are welcome! If you have ideas for new features or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
