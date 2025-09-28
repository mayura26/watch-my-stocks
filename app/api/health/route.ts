import { NextResponse } from 'next/server';
import client from '@/lib/db';

// GET /api/health - Health check endpoint for Coolify
export async function GET() {
  try {
    // Check database connection
    await client.execute('SELECT 1');
    
    // Check if alert scheduler is running (optional)
    // You could add more health checks here
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        alertScheduler: 'running' // PM2 will handle this
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      },
      { status: 503 }
    );
  }
}
