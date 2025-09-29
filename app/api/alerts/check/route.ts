import { NextRequest, NextResponse } from 'next/server';
import client from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { DataManager } from '@/lib/data-providers/manager';

// POST /api/alerts/check - Check all active alerts and trigger notifications
export async function POST(request: NextRequest) {
  try {
    // Security check for cron secret (if configured)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('Unauthorized alert check attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
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

    // Initialize data manager for direct API calls (no HTTP overhead)
    const dataManager = new DataManager();
    let checkedCount = 0;
    let triggeredCount = 0;

    // Group alerts by symbol to optimize price fetching and storage
    const alertsBySymbol = new Map<string, any[]>();
    for (const alert of alerts) {
      const symbol = String(alert.symbol);
      if (!alertsBySymbol.has(symbol)) {
        alertsBySymbol.set(symbol, []);
      }
      alertsBySymbol.get(symbol)!.push(alert);
    }

    console.log(`Processing ${alertsBySymbol.size} unique symbols with ${alerts.length} total alerts`);

    // Process symbols in batches to avoid overwhelming the APIs
    const symbolBatchSize = 10;
    const symbols = Array.from(alertsBySymbol.keys());
    
    for (let i = 0; i < symbols.length; i += symbolBatchSize) {
      const symbolBatch = symbols.slice(i, i + symbolBatchSize);
      
      try {
        // Get current prices for all symbols in this batch using DataManager directly
        console.log(`Fetching quotes for symbols: ${symbolBatch.join(', ')}`);
        const quotesMap = await dataManager.getMultipleQuotes(symbolBatch);
        
        // Process each symbol and all its alerts
        for (const symbol of symbolBatch) {
          const symbolAlerts = alertsBySymbol.get(symbol)!;
          const quoteData = quotesMap.get(symbol);
          const currentPrice = quoteData?.currentPrice;
          
          if (!currentPrice || typeof currentPrice !== 'number') {
            console.log(`No current price available for ${symbol}`);
            continue;
          }
          
          // Get previous price for cross-detection (once per symbol)
          const previousPrice = await getPreviousPrice(symbol);
          
          // Store current price for next check (once per symbol)
          await storePriceHistory(symbol, currentPrice);
          
          // Process all alerts for this symbol
          for (const alert of symbolAlerts) {
            checkedCount++;
            
            const thresholdValue = Number(alert.threshold_value);
            if (isNaN(thresholdValue)) {
              console.log(`Invalid threshold value for ${alert.symbol}`);
              continue;
            }
            
            const shouldTrigger = checkAlertCondition(alert, currentPrice, previousPrice);
            
            if (shouldTrigger) {
              // Check if we should trigger (dead bounce mechanism)
              const shouldCreateNotification = await shouldTriggerNotification(String(alert.id));
              
              if (shouldCreateNotification) {
                await createNotification(alert, currentPrice, previousPrice);
                await updateAlertTrigger(String(alert.id));
                triggeredCount++;
                console.log(`Alert triggered for ${alert.symbol}: ${alert.alert_type} ${thresholdValue} (crossed from ${previousPrice} to ${currentPrice})`);
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
        }
      
        // Small delay between batches to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing symbol batch ${i}-${i + symbolBatchSize}:`, error);
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

function checkAlertCondition(alert: any, currentPrice: number, previousPrice: number | null): boolean {
  const alertType = String(alert.alert_type);
  const thresholdValue = Number(alert.threshold_value);
  
  if (isNaN(thresholdValue)) {
    return false;
  }
  
  // If we don't have a previous price, we can't detect a cross
  // This will happen on the first check for a symbol
  if (previousPrice === null) {
    console.log(`No previous price available for ${alert.symbol}, skipping cross-detection`);
    return false;
  }
  
  switch (alertType) {
    case 'price_above':
      // Trigger only when price crosses from below/equal to above the threshold
      // old_price <= threshold AND new_price > threshold
      return previousPrice <= thresholdValue && currentPrice > thresholdValue;
      
    case 'price_below':
      // Trigger only when price crosses from above/equal to below the threshold
      // old_price >= threshold AND new_price < threshold
      return previousPrice >= thresholdValue && currentPrice < thresholdValue;
      
    case 'percentage_move':
      // For percentage moves, we'd need the previous price
      // For now, we'll skip this type until we implement percentage calculation
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

async function createNotification(alert: any, currentPrice: number, previousPrice: number | null): Promise<void> {
  const notificationId = uuidv4();
  const symbol = String(alert.symbol);
  const alertType = String(alert.alert_type);
  const thresholdValue = Number(alert.threshold_value);
  const userId = String(alert.user_id);
  const alertId = String(alert.id);
  
  const title = `Price Alert: ${symbol}`;
  
  // Create more informative message with cross information
  let message: string;
  if (previousPrice !== null) {
    const direction = alertType === 'price_above' ? 'rose above' : 'fell below';
    const change = currentPrice - previousPrice;
    const changePercent = ((change / previousPrice) * 100).toFixed(2);
    const changeSign = change >= 0 ? '+' : '';
    
    message = `${symbol} ${direction} $${thresholdValue.toFixed(2)} ($${previousPrice.toFixed(2)} → $${currentPrice.toFixed(2)}, ${changeSign}${changePercent}%)`;
  } else {
    // Fallback for first-time alerts
    message = `${symbol} ${alertType === 'price_above' ? 'rose above' : 'fell below'} $${thresholdValue.toFixed(2)} (current: $${currentPrice.toFixed(2)})`;
  }
  
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

// Helper function to get the most recent previous price for a symbol
async function getPreviousPrice(symbol: string): Promise<number | null> {
  try {
    const result = await client.execute({
      sql: `
        SELECT price 
        FROM price_history 
        WHERE symbol = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `,
      args: [symbol]
    });
    
    return result.rows.length > 0 ? Number(result.rows[0].price) : null;
  } catch (error) {
    console.error(`Error getting previous price for ${symbol}:`, error);
    return null;
  }
}

// Helper function to store current price in price history
async function storePriceHistory(symbol: string, price: number): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    // Check if we already have a price entry for this symbol in the last minute
    // This prevents duplicate entries when multiple alerts exist for the same symbol
    const recentEntry = await client.execute({
      sql: `
        SELECT COUNT(*) as count 
        FROM price_history 
        WHERE symbol = ? AND timestamp > datetime('now', '-1 minute')
      `,
      args: [symbol]
    });
    
    // Only insert if we don't have a recent entry
    if (recentEntry.rows[0]?.count === 0) {
      const priceId = uuidv4();
      await client.execute({
        sql: `
          INSERT INTO price_history (id, symbol, price, timestamp)
          VALUES (?, ?, ?, ?)
        `,
        args: [priceId, symbol, price, now]
      });
    }
  } catch (error) {
    console.error(`Error storing price history for ${symbol}:`, error);
    // Don't throw - we don't want price storage errors to break the alert system
  }
}
