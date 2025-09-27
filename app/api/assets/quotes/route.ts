import { NextRequest, NextResponse } from 'next/server';
import { dataManager } from '@/lib/data-providers/manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
      return NextResponse.json({ error: 'Symbols parameter is required' }, { status: 400 });
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
    
    if (symbols.length === 0) {
      return NextResponse.json({ quotes: [] });
    }

    const quotesMap = await dataManager.getMultipleQuotes(symbols);
    
    // Convert Map to array
    const quotes = Array.from(quotesMap.entries()).map(([symbol, quote]) => ({
      ...quote
    }));
    
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Multiple quotes error:', error);
    return NextResponse.json(
      { error: 'Failed to get quotes' },
      { status: 500 }
    );
  }
}
