import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user settings from database
    const result = await client.execute({
      sql: 'SELECT first_name, last_name, email, theme, notifications_enabled FROM users WHERE id = ?',
      args: [userId]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      theme: user.theme || 'auto',
      notificationsEnabled: Boolean(user.notifications_enabled),
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { firstName, lastName, email, theme, notificationsEnabled } = body;
    
    // console.log('Settings update request:', { userId, body });

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
      args: [email, userId]
    });

    // console.log('Email check result:', existingUser);

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email is already taken' },
        { status: 400 }
      );
    }

    // Update user settings
    await client.execute({
      sql: `
        UPDATE users 
        SET first_name = ?, last_name = ?, email = ?, theme = ?, notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [firstName, lastName, email, theme || 'auto', notificationsEnabled ? 1 : 0, userId]
    });
    
    // console.log('Database update result:', updateResult);

    // Verify the update by fetching the user data
    const verifyResult = await client.execute({
      sql: 'SELECT first_name, last_name, email, theme, notifications_enabled FROM users WHERE id = ?',
      args: [userId]
    });
    
    // console.log('Verification result:', verifyResult);

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        firstName,
        lastName,
        email,
        theme: theme || 'auto',
        notificationsEnabled: Boolean(notificationsEnabled),
      },
      verification: verifyResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
