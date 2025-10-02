import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';
import webpush from 'web-push';

// Configure webpush with VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all push subscriptions for the user
    const subscriptionsResult = await client.execute({
      sql: 'SELECT id, subscription_data FROM push_subscriptions WHERE user_id = ?',
      args: [session.user.id]
    });

    const validSubscriptions = [];
    const invalidSubscriptions = [];

    // Test each subscription by sending a test notification
    for (const row of subscriptionsResult.rows) {
      try {
        const subscription = JSON.parse(String(row.subscription_data));
        
        // Send a test notification to validate the subscription
        await webpush.sendNotification(subscription, JSON.stringify({
          title: 'Test',
          body: 'Validating subscription...',
          icon: '/icons/icon-192x192.png'
        }));
        
        validSubscriptions.push(row.id);
      } catch (error: any) {
        console.error('Invalid subscription detected:', error);
        invalidSubscriptions.push(row.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      const placeholders = invalidSubscriptions.map(() => '?').join(',');
      await client.execute({
        sql: `DELETE FROM push_subscriptions WHERE user_id = ? AND id IN (${placeholders})`,
        args: [session.user.id, ...invalidSubscriptions]
      });
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      validSubscriptions: validSubscriptions.length,
      removedSubscriptions: invalidSubscriptions.length,
      removedIds: invalidSubscriptions
    });

  } catch (error) {
    console.error('Error cleaning up push subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup push subscriptions' },
      { status: 500 }
    );
  }
}
