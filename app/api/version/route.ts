import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const VERSION_FILE = join(process.cwd(), 'VERSION');
    let version = '1';
    
    try {
      const versionContent = readFileSync(VERSION_FILE, 'utf-8').trim();
      version = versionContent || '1';
    } catch {
      // File doesn't exist, return default
      console.warn('VERSION file not found, returning default version 1');
    }
    
    return NextResponse.json({ version });
  } catch (error) {
    console.error('Error reading version:', error);
    return NextResponse.json({ version: '1' }, { status: 200 });
  }
}

