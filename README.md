# TimeTwister Chrome Extension

TimeTwister is a powerful Chrome extension by Bekshanskiy that lets you change the timezone for individual websites and tabs. It is perfect for developers, testers, remote workers, and anyone who needs to see how a website behaves in different timezones—without changing your system settings or using DevTools. Whether you're collaborating across regions, testing global apps, or working with distributed teams, TimeTwister makes it easy to simulate any timezone instantly, and gives you full control over which sites and tabs are affected.

## Features

- **Per-site and per-tab timezone override:** Set a different timezone for each website or tab, and it will be remembered automatically. The extension only affects the sites you choose, not your entire browser.
- **Universal timezone support:** Choose from the complete, official IANA timezone list (hundreds of options, always up-to-date).
- **Favorites:** Star your most-used timezones to keep them at the top of the list for quick access.
- **Search:** Instantly filter both your sites and the timezone list with a fast, modern search bar.
- **Default timezone:** Set a default timezone for new sites, or restore to your current location with one click.
- **Restore button:** Instantly revert the default timezone to your browser's current location.
- **Active icon indicator:** The extension's icon shows an "ON" badge when a timezone override is active on a tab.
- **Modern, consistent UI:** Clean, professional settings page with perfectly aligned columns, scrollable lists, and intuitive controls.
- **Full site management:** View, search, and control all sites with timezone overrides from the settings page. Change, remove, or update any site instantly.
- **No system changes:** Your computer's clock and Chrome's global settings are never touched.

## How It Works

TimeTwister uses Chrome's Debugger API to override the timezone for each tab, just like Chrome DevTools' "Sensors" panel. This is the most robust and reliable method available, and works on nearly all websites—even those that render dates server-side. The extension only affects the tabs and sites you enable it for, never your entire browser.

## Usage

1. **Install the extension** and pin it to your Chrome toolbar.
2. **Click the TimeTwister icon** on any website.
3. **Enable the extension for the current site or tab** and select your desired timezone from the universal list (use search or favorites for speed).
4. **Reload the page** (the extension will do this automatically for you) to see the timezone change take effect.
5. **Manage all your sites and favorites** from the extension's settings page (right-click the icon > Options, or use the gear/settings button in the popup). You can view, search, and control all sites with timezone overrides from one place.

## Settings Page Overview

- **General Settings:**
  - Set your default timezone (auto-detects your current location by default).
  - Restore button to revert to your current location's timezone.
- **Sites with Timezone Set:**
  - See and manage all sites where you've set a timezone.
  - Change the timezone for any site instantly.
  - Remove sites from the list with one click.
  - Search bar for fast filtering.
- **Favorite Timezones:**
  - Star/unstar any timezone (favorites always appear at the top).
  - Search and scroll through the complete timezone list.

## Use Cases

- **Developers:** Test how your web apps behave in different timezones, simulate user experiences from around the world, and debug tricky date/time issues. Control which sites and tabs are affected, and manage them all from the settings page.
- **Remote workers:** Collaborate with teams and clients in other regions, or preview how scheduling and time-based features appear for users in different locations. Only change the timezone for the sites you need.
- **QA/Testers:** Validate date and time formatting, scheduling, and logic for global applications, with per-site and per-tab control.
- **Anyone working across timezones:** Instantly see how any website looks and behaves in any region, without changing your system clock or browser settings. Manage all your timezone overrides from one place.

## Limitations

- The extension cannot change your system clock or the timezone in HTTP headers. It only affects how JavaScript and the browser display time for each site.
- Some sites may cache timezone information; a full reload is sometimes required.
- Only one extension or DevTools panel can control the timezone at a time (if you use DevTools Sensors, disable it to let TimeTwister work).

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the project directory.
5. The TimeTwister icon will appear in your Chrome toolbar.

## Contributing

Pull requests and suggestions are welcome! If you have ideas for new features or improvements, please open an issue or submit a PR.

---

Enjoy working across timezones with TimeTwister!
