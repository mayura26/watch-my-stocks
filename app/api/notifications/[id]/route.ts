import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// PUT /api/notifications/[id] - Update notification (mark as read/unread)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;
    const body = await request.json();
    const { is_read } = body;

    if (typeof is_read !== 'boolean') {
      return NextResponse.json(
        { error: 'is_read must be a boolean value' },
        { status: 400 }
      );
    }

    // Verify the notification belongs to the user
    const notificationCheck = await client.execute({
      sql: 'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      args: [notificationId, session.user.id]
    });

    if (notificationCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    // Update the notification
    await client.execute({
      sql: 'UPDATE notifications SET is_read = ? WHERE id = ?',
      args: [is_read, notificationId]
    });

    return NextResponse.json({
      message: 'Notification updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;

    // Verify the notification belongs to the user
    const notificationCheck = await client.execute({
      sql: 'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      args: [notificationId, session.user.id]
    });

    if (notificationCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the notification
    await client.execute({
      sql: 'DELETE FROM notifications WHERE id = ?',
      args: [notificationId]
    });

    return NextResponse.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
