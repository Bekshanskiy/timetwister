# TimeTwister Chrome Extension

> **Professional timezone override for websites** - Modern, accurate, and stylish timezone management for 2025

TimeTwister is a sophisticated browser extension that provides per-site timezone control with a beautiful, modern interface designed for 2025.

## ✨ Features

- **🎯 Per-site timezone settings:** Assign unique timezones to any website with precision
- **⚡ Real-time application:** Changes apply instantly without page refresh
- **⭐ Favorite timezones:** Quick access to your most-used timezones
- **🎨 Modern UI:** Clean, professional interface following 2025 design trends
- **🌙 Dark mode ready:** Automatic dark mode support based on system preferences
- **♿ Accessible:** Full keyboard navigation and screen reader support
- **🔄 Sync across devices:** Settings automatically sync via Chrome sync

## 🚀 Getting Started

### Installation

1. **Clone or download** this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **"Developer mode"** in the top right
4. Click **"Load unpacked"** and select the extension directory
5. The TimeTwister icon will appear in your toolbar

### Usage

1. **Click the TimeTwister icon** in your browser toolbar
2. **Toggle "Enable for this site"** to activate timezone override
3. **Select a timezone** from the beautiful dropdown list
4. **Click "Save Changes"** to apply immediately
5. **Visit the Settings page** to manage all your site configurations

## 🎨 2025 Design Features

- **Modern color palette** with subtle gradients
- **Smooth animations** and micro-interactions
- **Professional typography** with Inter font family
- **Accessible focus states** and high contrast support
- **Responsive hover effects** with modern transforms
- **Clean card-based layout** with proper shadows
- **Enhanced visual feedback** for all interactions

## 🔧 How It Works

TimeTwister uses Chrome's `debugger` API to override the browser's timezone for specific tabs. When you configure a timezone for a site:

1. The extension attaches to the tab's debugging context
2. It applies the timezone override using `Emulation.setTimezoneOverride`
3. Your settings are saved and synced across devices
4. The timezone is automatically reapplied on future visits

## 📁 Project Structure

```
timetwister/
├── manifest.json          # Extension configuration
├── background.js          # Service worker with enhanced error handling
├── popup.html            # Modern popup interface
├── options.html          # Professional settings page
├── common.css            # 2025-ready styling system
├── common.js             # Enhanced JavaScript with modern patterns
├── icons/                # Extension icons
└── README.md            # This file
```

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug fixes
- ✨ New features
- 🎨 UI improvements
- 📚 Documentation updates
- 🧪 Tests

Please feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for 2025** - Professional timezone management made beautiful and accessible.
