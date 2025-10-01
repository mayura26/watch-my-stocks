import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    // Get user and verify password
    const userResult = await client.execute({
      sql: 'SELECT password FROM users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password as string);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Delete all user data in the correct order (respecting foreign key constraints)
    await client.batch([
      // Delete notifications first (references alerts)
      {
        sql: 'DELETE FROM notifications WHERE user_id = ?',
        args: [userId]
      },
      
      // Delete alerts (references users)
      {
        sql: 'DELETE FROM alerts WHERE user_id = ?',
        args: [userId]
      },
      
      // Delete watchlist (references users)
      {
        sql: 'DELETE FROM watchlist WHERE user_id = ?',
        args: [userId]
      },
      
      // Finally delete the user
      {
        sql: 'DELETE FROM users WHERE id = ?',
        args: [userId]
      }
    ]);

    return NextResponse.json({
      message: 'Account and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
