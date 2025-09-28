import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function checkAlertsOnce() {
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

// Run the check once and exit
checkAlertsOnce().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
