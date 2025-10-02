import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription) {
      return NextResponse.json(
        { error: 'Push subscription is required' },
        { status: 400 }
      );
    }

    // Check if subscription already exists for this user
    const existingSubscription = await client.execute({
      sql: 'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      args: [session.user.id, subscription.endpoint]
    });

    if (existingSubscription.rows.length > 0) {
      // Update existing subscription
      await client.execute({
        sql: `
          UPDATE push_subscriptions 
          SET subscription_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND endpoint = ?
        `,
        args: [JSON.stringify(subscription), session.user.id, subscription.endpoint]
      });
    } else {
      // Create new subscription
      const subscriptionId = uuidv4();
      await client.execute({
        sql: `
          INSERT INTO push_subscriptions (id, user_id, endpoint, subscription_data, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        args: [subscriptionId, session.user.id, subscription.endpoint, JSON.stringify(subscription)]
      });
    }

    return NextResponse.json({ 
      message: 'Push subscription saved successfully' 
    });

  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      args: [session.user.id, endpoint]
    });

    return NextResponse.json({ 
      message: 'Push subscription removed successfully' 
    });

  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}
