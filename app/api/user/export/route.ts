import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all user data
    const [userResult, watchlistResult, alertsResult, notificationsResult] = await Promise.all([
      // User data
      client.execute({
        sql: 'SELECT id, email, first_name, last_name, theme, notifications_enabled, created_at FROM users WHERE id = ?',
        args: [userId]
      }),
      
      // Watchlist data
      client.execute({
        sql: 'SELECT id, symbol, asset_type, coin_id, added_at FROM watchlist WHERE user_id = ?',
        args: [userId]
      }),
      
      // Alerts data
      client.execute({
        sql: 'SELECT id, symbol, alert_type, threshold_value, is_active, is_enabled, last_triggered, trigger_count, created_at FROM alerts WHERE user_id = ?',
        args: [userId]
      }),
      
      // Notifications data
      client.execute({
        sql: 'SELECT id, alert_id, title, message, notification_type, is_read, created_at FROM notifications WHERE user_id = ?',
        args: [userId]
      })
    ]);

    const user = userResult.rows[0];
    const watchlist = watchlistResult.rows;
    const alerts = alertsResult.rows;
    const notifications = notificationsResult.rows;

    // Prepare export data
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        app: 'WatchMyStocks'
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        theme: user.theme,
        notificationsEnabled: Boolean(user.notifications_enabled),
        createdAt: user.created_at
      },
      watchlist: watchlist.map(item => ({
        id: item.id,
        symbol: item.symbol,
        assetType: item.asset_type,
        coinId: item.coin_id,
        addedAt: item.added_at
      })),
      alerts: alerts.map(alert => ({
        id: alert.id,
        symbol: alert.symbol,
        alertType: alert.alert_type,
        thresholdValue: alert.threshold_value,
        isActive: Boolean(alert.is_active),
        isEnabled: Boolean(alert.is_enabled),
        lastTriggered: alert.last_triggered,
        triggerCount: alert.trigger_count,
        createdAt: alert.created_at
      })),
      notifications: notifications.map(notification => ({
        id: notification.id,
        alertId: notification.alert_id,
        title: notification.title,
        message: notification.message,
        notificationType: notification.notification_type,
        isRead: Boolean(notification.is_read),
        createdAt: notification.created_at
      }))
    };

    // Return as downloadable JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="watchmystocks-data-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
