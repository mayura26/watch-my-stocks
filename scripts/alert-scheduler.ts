import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

class AlertScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('Alert scheduler is already running');
      return;
    }

    console.log('Starting alert scheduler...');
    this.isRunning = true;

    // Run immediately on start
    this.checkAlerts();

    // Then run every minute (60000ms)
    this.intervalId = setInterval(() => {
      this.checkAlerts();
    }, 60000);

    console.log('Alert scheduler started - checking alerts every minute');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Alert scheduler stopped');
  }

  private async checkAlerts() {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/alerts/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[${new Date().toISOString()}] Alert check: ${result.checked} checked, ${result.triggered} triggered`);
      } else {
        const error = await response.text();
        console.error(`[${new Date().toISOString()}] Alert check failed:`, error);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Alert check error:`, error);
    }
  }
}

// Create and start the scheduler
const scheduler = new AlertScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down alert scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down alert scheduler...');
  scheduler.stop();
  process.exit(0);
});

scheduler.start();
