import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// Type-safe session helper
function getTypedSession(session: any) {
  return session as { user: { id: string; email: string; name: string; firstName: string; lastName: string; theme: string; notificationsEnabled: boolean } } | null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const typedSession = getTypedSession(session);
    
    if (!typedSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's portfolio
    const result = await client.execute({
      sql: `
        SELECT wa.*, aa.name, aa.asset_type, aa.current_price, aa.last_updated, aa.coin_id
        FROM watchlist wa
        LEFT JOIN available_assets aa ON wa.symbol = aa.symbol
        WHERE wa.user_id = ?
        ORDER BY wa.added_at DESC
      `,
      args: [typedSession.user.id]
    });

    const portfolio = result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      name: row.name || row.symbol,
      type: row.asset_type || 'stock',
      currentPrice: row.current_price || 0,
      addedAt: row.added_at,
      lastUpdated: row.last_updated,
      coinId: row.coin_id // Include coin_id for crypto assets
    }));

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const typedSession = getTypedSession(session);
    
    if (!typedSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol, name, type, coinId } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Check if asset already exists in portfolio
    const existingResult = await client.execute({
      sql: 'SELECT id FROM watchlist WHERE user_id = ? AND symbol = ?',
      args: [typedSession.user.id, symbol.toUpperCase()]
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Asset already in portfolio' }, { status: 409 });
    }

    // Add to portfolio
    const id = crypto.randomUUID();
    const assetType = type || 'stock';
    const isCrypto = assetType === 'crypto';
    
    await client.execute({
      sql: `
        INSERT INTO watchlist (id, user_id, symbol, asset_type, coin_id, added_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      args: [id, typedSession.user.id, symbol.toUpperCase(), assetType, isCrypto ? coinId : null]
    });

    // Update or insert in available_assets table
    await client.execute({
      sql: `
        INSERT OR REPLACE INTO available_assets (id, symbol, name, asset_type, coin_id, is_active, last_updated, created_at)
        VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [crypto.randomUUID(), symbol.toUpperCase(), name || symbol, assetType, isCrypto ? coinId : null]
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Asset added to portfolio' 
    });
  } catch (error) {
    console.error('Portfolio add error:', error);
    return NextResponse.json(
      { error: 'Failed to add asset to portfolio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const typedSession = getTypedSession(session);
    
    if (!typedSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Remove from portfolio
    const result = await client.execute({
      sql: 'DELETE FROM watchlist WHERE user_id = ? AND symbol = ?',
      args: [typedSession.user.id, symbol.toUpperCase()]
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Asset not found in portfolio' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Asset removed from portfolio' 
    });
  } catch (error) {
    console.error('Portfolio remove error:', error);
    return NextResponse.json(
      { error: 'Failed to remove asset from portfolio' },
      { status: 500 }
    );
  }
}
