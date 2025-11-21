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
    const quotes = Array.from(quotesMap.entries()).map(([, quote]) => ({
      ...quote
    }));
    
    // Return partial results even if some quotes failed
    // This allows the frontend to update what it can and keep old data for the rest
    return NextResponse.json({ 
      quotes,
      partial: quotes.length < symbols.length // Indicate if we got partial results
    });
  } catch (error) {
    console.error('Multiple quotes error:', error);
    // Even on error, return empty array so frontend can keep old data
    return NextResponse.json({ 
      quotes: [],
      error: 'Some quotes failed to load',
      partial: true
    }, { status: 200 }); // Return 200 so frontend can still use old data
  }
}
