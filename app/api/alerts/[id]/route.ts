import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import client from '@/lib/db';

// PUT /api/alerts/[id] - Update an alert
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: alertId } = await params;
    const body = await request.json();
    const { threshold_value, is_enabled } = body;

    // Validate alert ownership
    const alertCheck = await client.execute({
      sql: 'SELECT id, alert_type FROM alerts WHERE id = ? AND user_id = ?',
      args: [alertId, session.user.id]
    });

    if (alertCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    const alert = alertCheck.rows[0];
    const updates: string[] = [];
    const args: any[] = [];

    // Update threshold value if provided
    if (threshold_value !== undefined) {
      const threshold = parseFloat(threshold_value);
      if (isNaN(threshold) || threshold <= 0) {
        return NextResponse.json(
          { error: 'Invalid threshold value' },
          { status: 400 }
        );
      }

      if (alert.alert_type === 'percentage_move' && (threshold < 1 || threshold > 100)) {
        return NextResponse.json(
          { error: 'Percentage must be between 1% and 100%' },
          { status: 400 }
        );
      }

      updates.push('threshold_value = ?');
      args.push(threshold);
    }

    // Update enabled status if provided
    if (is_enabled !== undefined) {
      updates.push('is_enabled = ?');
      args.push(is_enabled);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(alertId, session.user.id);

    await client.execute({
      sql: `UPDATE alerts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      args
    });

    return NextResponse.json({ message: 'Alert updated successfully' });

  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts/[id] - Delete an alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: alertId } = await params;

    // Validate alert ownership
    const alertCheck = await client.execute({
      sql: 'SELECT id FROM alerts WHERE id = ? AND user_id = ?',
      args: [alertId, session.user.id]
    });

    if (alertCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // First delete associated notifications (due to foreign key constraint)
    await client.execute({
      sql: 'DELETE FROM notifications WHERE alert_id = ?',
      args: [alertId]
    });

    // Then delete the alert
    await client.execute({
      sql: 'DELETE FROM alerts WHERE id = ? AND user_id = ?',
      args: [alertId, session.user.id]
    });

    return NextResponse.json({ message: 'Alert deleted successfully' });

  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}
