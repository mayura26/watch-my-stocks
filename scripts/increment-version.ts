import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VERSION_FILE = join(process.cwd(), 'VERSION');
const VERSION_JSON_FILE = join(process.cwd(), 'public', 'version.json');

try {
  // Read current version
  let currentVersion = 1;
  try {
    const versionContent = readFileSync(VERSION_FILE, 'utf-8').trim();
    currentVersion = parseInt(versionContent, 10) || 1;
  } catch (error) {
    // File doesn't exist, start at 1
    console.log('VERSION file not found, starting at 1');
  }

  // Increment version
  const newVersion = currentVersion + 1;
  
  // Write new version to VERSION file
  writeFileSync(VERSION_FILE, `${newVersion}\n`, 'utf-8');
  
  // Write version to public/version.json for service worker
  writeFileSync(VERSION_JSON_FILE, JSON.stringify({ version: newVersion.toString() }), 'utf-8');
  
  console.log(`Version incremented: ${currentVersion} -> ${newVersion}`);
} catch (error) {
  console.error('Error incrementing version:', error);
  process.exit(1);
}

