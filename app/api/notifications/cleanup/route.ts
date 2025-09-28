import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// DELETE /api/notifications/cleanup - Clean up notifications older than 30 days
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete notifications older than 30 days
    const result = await client.execute({
      sql: `
        DELETE FROM notifications 
        WHERE user_id = ? 
        AND created_at < datetime('now', '-30 days')
      `,
      args: [session.user.id]
    });

    return NextResponse.json({
      message: 'Old notifications cleaned up successfully',
      deletedCount: result.rowsAffected
    });

  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    return NextResponse.json(
      { error: 'Failed to clean up notifications' },
      { status: 500 }
    );
  }
}
