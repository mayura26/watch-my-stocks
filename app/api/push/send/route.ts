import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import client from '@/lib/db';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:km.vivekananda@gmail.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, url, alertId } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    // Get all push subscriptions for the user
    const subscriptionsResult = await client.execute({
      sql: 'SELECT subscription_data FROM push_subscriptions WHERE user_id = ?',
      args: [userId]
    });

    if (subscriptionsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No push subscriptions found for user' },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/notifications',
      alertId,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    });

    const results = [];
    const errors = [];

    // Send push notification to all subscriptions for this user
    for (const row of subscriptionsResult.rows) {
      try {
        const subscription = JSON.parse(String(row.subscription_data));
        
        await webpush.sendNotification(subscription, payload);
        results.push({ subscription: subscription.endpoint, status: 'sent' });
      } catch (error: any) {
        console.error('Error sending push notification:', error);
        errors.push({ 
          subscription: JSON.parse(String(row.subscription_data)).endpoint, 
          error: error.message 
        });
        
        // If subscription is invalid, remove it from database
        if (error.statusCode === 410) {
          await client.execute({
            sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND subscription_data LIKE ?',
            args: [userId, `%"${JSON.parse(String(row.subscription_data)).endpoint}"%`]
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Push notifications sent',
      sent: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Error in push notification endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    );
  }
}
