import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// PUT /api/notifications/mark-all-read - Mark all notifications as read
export async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark all notifications as read for the user
    const result = await client.execute({
      sql: 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      args: [session.user.id]
    });

    return NextResponse.json({
      message: 'All notifications marked as read',
      updatedCount: result.rowsAffected
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
