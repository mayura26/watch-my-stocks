import { NextRequest, NextResponse } from 'next/server';
import { dataManager } from '@/lib/data-providers/manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const quote = await dataManager.getAssetQuote(symbol.toUpperCase());
    
    if (!quote) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    
    return NextResponse.json({ quote });
  } catch (error) {
    console.error('Asset quote error:', error);
    return NextResponse.json(
      { error: 'Failed to get asset quote' },
      { status: 500 }
    );
  }
}
