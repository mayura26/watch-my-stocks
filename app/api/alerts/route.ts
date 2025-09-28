import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/alerts - Get all alerts for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    let query = `
      SELECT 
        a.*,
        w.asset_type,
        aa.name as asset_name
      FROM alerts a
      LEFT JOIN watchlist w ON a.symbol = w.symbol AND a.user_id = w.user_id
      LEFT JOIN available_assets aa ON a.symbol = aa.symbol
      WHERE a.user_id = ?
    `;
    
    const params: any[] = [session.user.id];

    if (symbol) {
      query += ' AND a.symbol = ?';
      params.push(symbol);
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await client.execute({
      sql: query,
      args: params
    });

    const alerts = result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      asset_name: row.asset_name,
      asset_type: row.asset_type,
      alert_type: row.alert_type,
      threshold_value: row.threshold_value,
      is_active: row.is_active,
      is_enabled: row.is_enabled,
      last_triggered: row.last_triggered,
      trigger_count: row.trigger_count,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({ alerts });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new alert
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, alert_type, threshold_value } = body;

    // Validation
    if (!symbol || !alert_type || !threshold_value) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, alert_type, threshold_value' },
        { status: 400 }
      );
    }

    if (!['price_above', 'price_below', 'percentage_move'].includes(alert_type)) {
      return NextResponse.json(
        { error: 'Invalid alert type' },
        { status: 400 }
      );
    }

    const threshold = parseFloat(threshold_value);
    if (isNaN(threshold) || threshold <= 0) {
      return NextResponse.json(
        { error: 'Invalid threshold value' },
        { status: 400 }
      );
    }

    if (alert_type === 'percentage_move' && (threshold < 1 || threshold > 100)) {
      return NextResponse.json(
        { error: 'Percentage must be between 1% and 100%' },
        { status: 400 }
      );
    }

    // Check if user has the asset in their portfolio
    const portfolioCheck = await client.execute({
      sql: 'SELECT id FROM watchlist WHERE user_id = ? AND symbol = ?',
      args: [session.user.id, symbol]
    });

    if (portfolioCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Asset must be in your portfolio to create alerts' },
        { status: 400 }
      );
    }

    // Check alert count limit
    const countResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM alerts WHERE user_id = ?',
      args: [session.user.id]
    });

    const alertCount = countResult.rows[0]?.count as number || 0;
    if (alertCount >= 500) {
      return NextResponse.json(
        { error: 'Maximum alert limit reached (500 alerts)' },
        { status: 400 }
      );
    }

    // Check for duplicate alert
    const duplicateCheck = await client.execute({
      sql: 'SELECT id FROM alerts WHERE user_id = ? AND symbol = ? AND alert_type = ? AND threshold_value = ?',
      args: [session.user.id, symbol, alert_type, threshold]
    });

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'An identical alert already exists' },
        { status: 400 }
      );
    }

    // Create the alert
    const alertId = uuidv4();
    await client.execute({
      sql: `
        INSERT INTO alerts (id, user_id, symbol, alert_type, threshold_value, is_active, is_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [alertId, session.user.id, symbol, alert_type, threshold, true, true]
    });

    return NextResponse.json({ 
      message: 'Alert created successfully',
      alert_id: alertId
    });

  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
