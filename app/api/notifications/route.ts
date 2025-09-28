import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/notifications - Get all notifications for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    let query = `
      SELECT 
        n.*,
        a.symbol,
        a.alert_type,
        a.threshold_value,
        aa.name as asset_name,
        aa.asset_type
      FROM notifications n
      LEFT JOIN alerts a ON n.alert_id = a.id
      LEFT JOIN available_assets aa ON a.symbol = aa.symbol
      WHERE n.user_id = ?
    `;

    const params: any[] = [session.user.id];

    if (unreadOnly) {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await client.execute({
      sql: query,
      args: params
    });

    const notifications = result.rows.map((row: any) => ({
      id: row.id,
      alert_id: row.alert_id,
      symbol: row.symbol,
      asset_name: row.asset_name,
      asset_type: row.asset_type,
      alert_type: row.alert_type,
      threshold_value: row.threshold_value,
      title: row.title,
      message: row.message,
      notification_type: row.notification_type,
      is_read: Boolean(row.is_read),
      created_at: row.created_at
    }));

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE n.user_id = ?
      ${unreadOnly ? 'AND n.is_read = FALSE' : ''}
    `;

    const countResult = await client.execute({
      sql: countQuery,
      args: [session.user.id]
    });

    const total = countResult.rows[0]?.total || 0;

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alert_id, title, message, notification_type = 'price_alert' } = body;

    if (!alert_id || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: alert_id, title, message' },
        { status: 400 }
      );
    }

    // Verify the alert belongs to the user
    const alertCheck = await client.execute({
      sql: 'SELECT id FROM alerts WHERE id = ? AND user_id = ?',
      args: [alert_id, session.user.id]
    });

    if (alertCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      );
    }

    const notificationId = uuidv4();

    await client.execute({
      sql: `
        INSERT INTO notifications (id, user_id, alert_id, title, message, notification_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [notificationId, session.user.id, alert_id, title, message, notification_type]
    });

    return NextResponse.json({
      id: notificationId,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
