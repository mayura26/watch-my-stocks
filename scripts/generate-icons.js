const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Read SVG content from file
const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PNG icons from SVG...');
  
  for (const size of iconSizes) {
    try {
      const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      // Convert SVG to PNG using sharp
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(iconPath);
      
      console.log(`✓ Created icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to create icon-${size}x${size}.png:`, error.message);
    }
  }
  
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
