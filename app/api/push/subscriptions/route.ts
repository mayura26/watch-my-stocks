import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all push subscriptions for the user
    const subscriptionsResult = await client.execute({
      sql: `
        SELECT 
          id,
          endpoint,
          device_name,
          user_agent,
          last_seen,
          is_active,
          created_at,
          updated_at
        FROM push_subscriptions 
        WHERE user_id = ? 
        ORDER BY last_seen DESC
      `,
      args: [session.user.id]
    });

    const subscriptions = subscriptionsResult.rows.map(row => ({
      id: row.id,
      endpoint: row.endpoint,
      deviceName: row.device_name || 'Unknown Device',
      userAgent: row.user_agent || 'Unknown Browser',
      lastSeen: row.last_seen,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ subscriptions });

  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch push subscriptions' },
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

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Delete the specific subscription
    await client.execute({
      sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND id = ?',
      args: [session.user.id, subscriptionId]
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
