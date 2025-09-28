import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// GET /api/alerts/count - Get alert count for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM alerts WHERE user_id = ?',
      args: [session.user.id]
    });

    const count = result.rows[0]?.count as number || 0;

    return NextResponse.json({ count });

  } catch (error) {
    console.error('Error fetching alert count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert count' },
      { status: 500 }
    );
  }
}
