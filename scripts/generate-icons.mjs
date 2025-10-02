import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      
      // Create maskable icon optimized for circular icons with minimal padding
      // Reduced safe zone to 5% for circular icons (10% total padding)
      const safeZone = size * 0.05; // 5% padding on each side for minimal edge
      const iconSize = size - (safeZone * 2); // Icon content size
      
      // Convert SVG to PNG using sharp with theme-matching background
      await sharp(Buffer.from(svgContent))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 } // Dark blue-gray theme color
        })
        .png()
        .toFile(iconPath);
      
      console.log(`✓ Created icon-${size}x${size}.png with minimal ${safeZone.toFixed(1)}px safe zone`);
    } catch (error) {
      console.error(`✗ Failed to create icon-${size}x${size}.png:`, error.message);
    }
  }
  
  console.log('Icon generation complete!');
  console.log('Note: Icons optimized for circular design with minimal safe zones and theme background');
}

generateIcons().catch(console.error);
