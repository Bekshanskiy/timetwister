const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration for icon sizes needed by Chrome extension
const iconSizes = [16, 32, 48, 128];

async function generateIcons(svgPath, outputPrefix = 'icon') {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG file not found:', svgPath);
    return;
  }

  // Create icons directory in the parent directory (main project folder)
  const iconsDir = path.join(__dirname, '..', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
  }

  console.log('Generating PNG icons from SVG...');

  for (const size of iconSizes) {
    const outputPath = path.join(iconsDir, `${outputPrefix}${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${outputPrefix}${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate ${outputPrefix}${size}.png:`, error.message);
    }
  }

  console.log('Icon generation complete!');
}

// Usage: node generate-icons.js path/to/your/icon.svg [output-prefix]
const svgPath = process.argv[2];
const outputPrefix = process.argv[3] || 'icon';

if (!svgPath) {
  console.log('Usage: node generate-icons.js <svg-file-path> [output-prefix]');
  console.log('Example: node generate-icons.js my-icon.svg timetwister_');
  console.log('');
  console.log('This will generate PNG icons in the ../icons/ directory');
  process.exit(1);
}

generateIcons(svgPath, outputPrefix);
