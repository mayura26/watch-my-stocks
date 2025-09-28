import { NextRequest, NextResponse } from 'next/server';
import client from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { DataManager } from '@/lib/data-providers/manager';

// POST /api/alerts/check - Check all active alerts and trigger notifications
export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or background service
    // For now, we'll make it accessible but in production you'd want to secure it
    
    console.log('Starting alert check process...');
    
    // Get all active and enabled alerts
    const alertsResult = await client.execute({
      sql: `
        SELECT 
          a.*,
          aa.name as asset_name,
          aa.asset_type
        FROM alerts a
        LEFT JOIN available_assets aa ON a.symbol = aa.symbol
        WHERE a.is_active = TRUE 
        AND a.is_enabled = TRUE
        ORDER BY a.created_at ASC
      `
    });

    const alerts = alertsResult.rows;
    console.log(`Found ${alerts.length} active alerts to check`);

    if (alerts.length === 0) {
      return NextResponse.json({
        message: 'No active alerts to check',
        checked: 0,
        triggered: 0
      });
    }

    const dataManager = new DataManager();
    let checkedCount = 0;
    let triggeredCount = 0;

    // Process alerts in batches to avoid overwhelming the APIs
    const batchSize = 10;
    for (let i = 0; i < alerts.length; i += batchSize) {
      const batch = alerts.slice(i, i + batchSize);
      
        // Get current prices for all symbols in this batch
        const symbols = batch.map((alert: any) => String(alert.symbol));
        const uniqueSymbols = [...new Set(symbols)];
        
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const quotesResponse = await fetch(`${baseUrl}/api/assets/quotes?symbols=${uniqueSymbols.join(',')}`);
          if (!quotesResponse.ok) {
            console.error(`Failed to fetch quotes for batch: ${uniqueSymbols.join(',')}`);
            continue;
          }
          
          const quotesData = await quotesResponse.json();
          const quotes = quotesData.quotes || {};
          
          // Check each alert in the batch
          for (const alert of batch) {
            checkedCount++;
            const currentPrice = quotes[String(alert.symbol)]?.price;
            
            if (!currentPrice || typeof currentPrice !== 'number') {
              console.log(`No current price available for ${alert.symbol}`);
              continue;
            }
            
            const thresholdValue = Number(alert.threshold_value);
            if (isNaN(thresholdValue)) {
              console.log(`Invalid threshold value for ${alert.symbol}`);
              continue;
            }
            
            const shouldTrigger = checkAlertCondition(alert, currentPrice);
            
            if (shouldTrigger) {
              // Check if we should trigger (dead bounce mechanism)
              const shouldCreateNotification = await shouldTriggerNotification(String(alert.id));
              
              if (shouldCreateNotification) {
                await createNotification(alert, currentPrice);
                await updateAlertTrigger(String(alert.id));
                triggeredCount++;
                console.log(`Alert triggered for ${alert.symbol}: ${alert.alert_type} ${thresholdValue} (current: ${currentPrice})`);
              }
            } else {
              // For testing: create a notification if the price is close to the threshold
              const priceDiff = Math.abs(currentPrice - thresholdValue);
              const thresholdPercent = (priceDiff / thresholdValue) * 100;
              
              if (thresholdPercent < 5) { // Within 5% of threshold
                console.log(`Price close to threshold for ${alert.symbol}: ${currentPrice} vs ${thresholdValue} (${thresholdPercent.toFixed(1)}% away)`);
              }
            }
          }
        
        // Small delay between batches to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
        continue;
      }
    }

    console.log(`Alert check completed: ${checkedCount} checked, ${triggeredCount} triggered`);
    
    return NextResponse.json({
      message: 'Alert check completed',
      checked: checkedCount,
      triggered: triggeredCount
    });

  } catch (error) {
    console.error('Error in alert check process:', error);
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    );
  }
}

function checkAlertCondition(alert: any, currentPrice: number): boolean {
  const alertType = String(alert.alert_type);
  const thresholdValue = Number(alert.threshold_value);
  
  if (isNaN(thresholdValue)) {
    return false;
  }
  
  switch (alertType) {
    case 'price_above':
      return currentPrice > thresholdValue;
    case 'price_below':
      return currentPrice < thresholdValue;
    case 'percentage_move':
      // For percentage moves, we'd need the previous price
      // For now, we'll skip this type until we implement price history tracking
      return false;
    default:
      return false;
  }
}

async function shouldTriggerNotification(alertId: string): Promise<boolean> {
  // Dead bounce mechanism: Check if alert was triggered in the last 15 minutes
  const recentTrigger = await client.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM notifications n
      JOIN alerts a ON n.alert_id = a.id
      WHERE a.id = ? 
      AND n.created_at > datetime('now', '-15 minutes')
    `,
    args: [alertId]
  });
  
  return recentTrigger.rows[0]?.count === 0;
}

async function createNotification(alert: any, currentPrice: number): Promise<void> {
  const notificationId = uuidv4();
  const symbol = String(alert.symbol);
  const alertType = String(alert.alert_type);
  const thresholdValue = Number(alert.threshold_value);
  const userId = String(alert.user_id);
  const alertId = String(alert.id);
  
  const title = `Price Alert: ${symbol}`;
  const message = `${symbol} ${alertType === 'price_above' ? 'rose above' : 'fell below'} $${thresholdValue.toFixed(2)} (current: $${currentPrice.toFixed(2)})`;
  
  await client.execute({
    sql: `
      INSERT INTO notifications (id, user_id, alert_id, title, message, notification_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [notificationId, userId, alertId, title, message, 'price_alert']
  });
}

async function updateAlertTrigger(alertId: string): Promise<void> {
  await client.execute({
    sql: `
      UPDATE alerts 
      SET 
        last_triggered = datetime('now'),
        trigger_count = trigger_count + 1
      WHERE id = ?
    `,
    args: [alertId]
  });
}
