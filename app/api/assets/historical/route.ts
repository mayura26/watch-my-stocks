import { NextRequest, NextResponse } from 'next/server';
import { dataManager } from '@/lib/data-providers/manager';
import client from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const timeframeParam = searchParams.get('timeframe') || '1d';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Validate timeframe
    if (!['15m', '1d'].includes(timeframeParam)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be 15m or 1d' },
        { status: 400 }
      );
    }

    const timeframe = timeframeParam as '15m' | '1d';

    // Get coin_id from database for crypto assets
    let coinId: string | undefined;
    try {
      const result = await client.execute({
        sql: 'SELECT coin_id, asset_type FROM available_assets WHERE symbol = ?',
        args: [symbol.toUpperCase()]
      });
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        if (row.asset_type === 'crypto' && row.coin_id) {
          coinId = row.coin_id as string;
          console.log(`API: Found coin_id for ${symbol}: ${coinId}`);
        }
      }
    } catch (error) {
      console.warn(`API: Could not fetch coin_id for ${symbol}:`, error);
    }

    // Get historical data from data manager
    console.log(`API: Fetching historical data for ${symbol}, timeframe: ${timeframe}, coinId: ${coinId || 'none'}`);
    const historicalData = await dataManager.getHistoricalData(symbol, timeframe, coinId);
    console.log(`API: Received ${historicalData?.length || 0} data points`);

    if (!historicalData || historicalData.length === 0) {
      console.log(`API: No data returned for ${symbol} ${timeframe}`);
      return NextResponse.json(
        { 
          error: 'No historical data available. This may be due to API rate limits, data source issues, or the symbol not being supported.',
          details: 'Try again in a few moments or check if the symbol is correct.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol,
      timeframe,
      data: historicalData,
      count: historicalData.length
    });

  } catch (error) {
    console.error('Historical data API error:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to fetch historical data';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'API rate limit exceeded. Please try again in a few moments.';
        statusCode = 429;
      } else if (error.message.includes('consent') || error.message.includes('yahoo')) {
        errorMessage = 'Data source temporarily unavailable due to consent requirements. Please try again later.';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. The data source may be slow. Please try again.';
        statusCode = 504;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'This is likely due to API rate limits or data source issues. Please try again in a few moments.'
      },
      { status: statusCode }
    );
  }
}
