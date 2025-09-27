import { NextRequest, NextResponse } from 'next/server';
import { dataManager } from '@/lib/data-providers/manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const assetType = searchParams.get('type') as 'stock' | 'crypto' | 'future' | null;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const results = await dataManager.searchAssets(query.trim(), assetType);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Asset search error:', error);
    return NextResponse.json(
      { error: 'Failed to search assets' },
      { status: 500 }
    );
  }
}
