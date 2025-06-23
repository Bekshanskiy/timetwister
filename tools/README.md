# TimeTwister Tools

This folder contains development tools for the TimeTwister Chrome extension.

## Icon Generator

The `generate-icons.js` script converts SVG files to PNG icons in the required sizes for Chrome extensions.

### Setup

1. Navigate to the tools directory:
   ```bash
   cd tools
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

Generate icons from an SVG file:

```bash
# Basic usage
npm run generate-icons path/to/your/icon.svg

# With custom prefix
npm run generate-icons path/to/your/icon.svg custom_prefix_
```

### Examples

```bash
# Generate icons with default naming (icon16.png, icon32.png, etc.)
npm run generate-icons ../my-timetwister-icon.svg

# Generate icons with custom prefix (option_1_icon16.png, etc.)
npm run generate-icons ../my-timetwister-icon.svg option_1_icon
```

### Output

The generated PNG files will be saved to the `../icons/` directory in the following sizes:
- 16×16px
- 32×32px
- 48×48px
- 128×128px

These sizes match the requirements specified in the Chrome extension manifest.
