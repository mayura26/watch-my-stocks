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
          
          // Store daily open price if this is the first price of the day
          await storeDailyOpenPrice(symbol, currentPrice);
          
          // Process all alerts for this symbol
          let updatedPreviousPrice = previousPrice; // Track price updates for subsequent alerts
          
          for (const alert of symbolAlerts) {
            checkedCount++;
            
            const thresholdValue = Number(alert.threshold_value);
            if (isNaN(thresholdValue)) {
              console.log(`Invalid threshold value for ${alert.symbol}`);
              continue;
            }
            
            // For price above/below alerts, use the last triggered price as baseline if available
            // This prevents the same alert from triggering multiple times with the same old price
            let baselinePrice = updatedPreviousPrice;
            if (alert.alert_type === 'price_above' || alert.alert_type === 'price_below') {
              const lastTriggeredPrice = await getLastTriggeredPrice(String(alert.id));
              if (lastTriggeredPrice !== null) {
                baselinePrice = lastTriggeredPrice;
                console.log(`Using last triggered price as baseline for alert ${alert.id}: ${baselinePrice}`);
              }
            }
            
            const shouldTrigger = await checkAlertCondition(alert, currentPrice, baselinePrice);
            
            // Add detailed logging to understand what's happening
            console.log(`Checking alert ${alert.id} for ${alert.symbol}: baseline=${baselinePrice}, current=${currentPrice}, threshold=${thresholdValue}, shouldTrigger=${shouldTrigger}`);
            
            if (shouldTrigger) {
              // Check if we should trigger (dead bounce mechanism)
              const shouldCreateNotification = await shouldTriggerNotification(String(alert.id));
              
              console.log(`Alert ${alert.id} condition met, dead bounce check: ${shouldCreateNotification}`);
              
              if (shouldCreateNotification) {
                await createNotification(alert, currentPrice, baselinePrice);
                await updateAlertTrigger(String(alert.id), currentPrice);
                triggeredCount++;
                console.log(`Alert triggered for ${alert.symbol}: ${alert.alert_type} ${thresholdValue} (crossed from ${baselinePrice} to ${currentPrice})`);
                
                // Update the previous price reference for subsequent alerts in this batch
                // This ensures that if multiple alerts trigger for the same symbol, 
                // each subsequent alert uses the current price as the new baseline
                updatedPreviousPrice = currentPrice;
              } else {
                console.log(`Alert ${alert.id} blocked by dead bounce mechanism (triggered within last 15 minutes)`);
              }
            }
          }
          
          // Store current price for next check (AFTER all alerts are processed)
          await storePriceHistory(symbol, currentPrice);
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

async function checkAlertCondition(alert: any, currentPrice: number, previousPrice: number | null): Promise<boolean> {
  const alertType = String(alert.alert_type);
  const thresholdValue = Number(alert.threshold_value);
  
  if (isNaN(thresholdValue)) {
    return false;
  }
  
  switch (alertType) {
    case 'price_above':
      // If we don't have a previous price, we can't detect a cross
      if (previousPrice === null) {
        console.log(`No previous price available for ${alert.symbol}, skipping cross-detection`);
        return false;
      }
      // Trigger only when price crosses from below/equal to above the threshold
      // old_price <= threshold AND new_price > threshold
      return previousPrice <= thresholdValue && currentPrice > thresholdValue;
      
    case 'price_below':
      // If we don't have a previous price, we can't detect a cross
      if (previousPrice === null) {
        console.log(`No previous price available for ${alert.symbol}, skipping cross-detection`);
        return false;
      }
      // Trigger only when price crosses from above/equal to below the threshold
      // old_price >= threshold AND new_price < threshold
      return previousPrice >= thresholdValue && currentPrice < thresholdValue;
      
    case 'percentage_move':
      return await checkPercentageMoveAlert(alert, currentPrice, previousPrice);
      
    default:
      return false;
  }
}

async function shouldTriggerNotification(alertId: string): Promise<boolean> {
  // Dead bounce mechanism: Check if alert was triggered in the last 15 minutes
  // Use the alert's last_triggered timestamp instead of notification creation time
  const recentTrigger = await client.execute({
    sql: `
      SELECT last_triggered
      FROM alerts
      WHERE id = ? 
      AND last_triggered > datetime('now', '-15 minutes')
    `,
    args: [alertId]
  });
  
  // If we found a recent trigger, don't send another notification
  return recentTrigger.rows.length === 0;
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
  
  if (alertType === 'percentage_move') {
    // Handle percentage move alerts
    const dailyOpenPrice = await getDailyOpenPrice(symbol);
    if (dailyOpenPrice !== null) {
      const currentPercentChange = ((currentPrice - dailyOpenPrice) / dailyOpenPrice) * 100;
      const previousPercentChange = previousPrice ? ((previousPrice - dailyOpenPrice) / dailyOpenPrice) * 100 : 0;
      
      const direction = currentPercentChange > previousPercentChange ? 'rose' : 'fell';
      const changeSign = currentPercentChange >= 0 ? '+' : '';
      
      message = `${symbol} ${direction} ${changeSign}${currentPercentChange.toFixed(2)}% from daily open ($${dailyOpenPrice.toFixed(2)} → $${currentPrice.toFixed(2)}, threshold: ${thresholdValue}%)`;
    } else {
      // Fallback if no daily open price
      message = `${symbol} percentage move alert triggered (current: $${currentPrice.toFixed(2)}, threshold: ${thresholdValue}%)`;
    }
  } else {
    // Handle price above/below alerts
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
  }
  
  // Store notification in database
  await client.execute({
    sql: `
      INSERT INTO notifications (id, user_id, alert_id, title, message, notification_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [notificationId, userId, alertId, title, message, 'price_alert']
  });

  // Send push notification
  try {
    const pushResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        body: message,
        url: '/notifications',
        alertId
      })
    });

    if (!pushResponse.ok) {
      console.error('Failed to send push notification:', await pushResponse.text());
    } else {
      console.log(`Push notification sent for alert ${alertId}`);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    // Don't throw - we don't want push notification errors to break the alert system
  }
}

async function updateAlertTrigger(alertId: string, triggeredPrice: number): Promise<void> {
  await client.execute({
    sql: `
      UPDATE alerts 
      SET 
        last_triggered = datetime('now'),
        trigger_count = trigger_count + 1,
        last_triggered_price = ?
      WHERE id = ?
    `,
    args: [triggeredPrice, alertId]
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

// Helper function to get the last triggered price for an alert
async function getLastTriggeredPrice(alertId: string): Promise<number | null> {
  try {
    const result = await client.execute({
      sql: `
        SELECT last_triggered_price 
        FROM alerts 
        WHERE id = ? AND last_triggered_price IS NOT NULL
      `,
      args: [alertId]
    });
    
    return result.rows.length > 0 ? Number(result.rows[0].last_triggered_price) : null;
  } catch (error) {
    console.error(`Error getting last triggered price for alert ${alertId}:`, error);
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

// Helper function to store daily open price if it's the first price of the day
async function storeDailyOpenPrice(symbol: string, price: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check if we already have an open price for today
    const existingEntry = await client.execute({
      sql: `
        SELECT COUNT(*) as count 
        FROM daily_open_prices 
        WHERE symbol = ? AND date = ?
      `,
      args: [symbol, today]
    });
    
    // Only insert if we don't have an entry for today
    if (existingEntry.rows[0]?.count === 0) {
      const openPriceId = uuidv4();
      await client.execute({
        sql: `
          INSERT INTO daily_open_prices (id, symbol, date, open_price)
          VALUES (?, ?, ?, ?)
        `,
        args: [openPriceId, symbol, today, price]
      });
      console.log(`Stored daily open price for ${symbol}: $${price.toFixed(2)} on ${today}`);
    }
  } catch (error) {
    console.error(`Error storing daily open price for ${symbol}:`, error);
    // Don't throw - we don't want price storage errors to break the alert system
  }
}

// Helper function to get today's open price for a symbol
async function getDailyOpenPrice(symbol: string): Promise<number | null> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const result = await client.execute({
      sql: `
        SELECT open_price 
        FROM daily_open_prices 
        WHERE symbol = ? AND date = ?
      `,
      args: [symbol, today]
    });
    
    return result.rows.length > 0 ? Number(result.rows[0].open_price) : null;
  } catch (error) {
    console.error(`Error getting daily open price for ${symbol}:`, error);
    return null;
  }
}

// Helper function to get the highest threshold level that has been triggered for an alert
async function getHighestTriggeredThresholdLevel(alertId: string, thresholdPercent: number, symbol: string): Promise<number> {
  try {
    // Check if the last trigger was today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const result = await client.execute({
      sql: `
        SELECT last_triggered, last_triggered_price
        FROM alerts
        WHERE id = ? AND last_triggered IS NOT NULL AND last_triggered_price IS NOT NULL
      `,
      args: [alertId]
    });
    
    if (result.rows.length === 0) {
      // No previous trigger, so highest level is 0
      return 0;
    }
    
    const lastTriggered = String(result.rows[0].last_triggered);
    const lastTriggeredDate = lastTriggered.split('T')[0]; // Get date part
    
    // If last trigger was not today, reset to level 0 (new day, new tracking)
    if (lastTriggeredDate !== today) {
      return 0;
    }
    
    const lastTriggeredPrice = Number(result.rows[0].last_triggered_price);
    
    // Get today's open price
    const dailyOpenPrice = await getDailyOpenPrice(symbol);
    if (dailyOpenPrice === null) {
      return 0;
    }
    
    // Calculate the percentage change when it was last triggered
    const lastTriggeredPercentChange = Math.abs(((lastTriggeredPrice - dailyOpenPrice) / dailyOpenPrice) * 100);
    
    // Calculate which threshold level that represents
    // Threshold level = floor(percentageChange / thresholdPercent)
    // E.g., if threshold is 5% and price moved 12%, level = floor(12/5) = 2 (meaning 10% threshold)
    const thresholdLevel = Math.floor(lastTriggeredPercentChange / Math.abs(thresholdPercent));
    
    return thresholdLevel;
  } catch (error) {
    console.error(`Error getting highest triggered threshold level for alert ${alertId}:`, error);
    return 0;
  }
}

// Helper function to check percentage move alert conditions
async function checkPercentageMoveAlert(alert: any, currentPrice: number, previousPrice: number | null): Promise<boolean> {
  const symbol = String(alert.symbol);
  const thresholdPercent = Number(alert.threshold_value);
  const alertId = String(alert.id);
  
  // Get today's open price
  const dailyOpenPrice = await getDailyOpenPrice(symbol);
  if (dailyOpenPrice === null) {
    console.log(`No daily open price available for ${symbol}, skipping percentage alert`);
    return false;
  }
  
  // Calculate current percentage change from open
  const currentPercentChange = ((currentPrice - dailyOpenPrice) / dailyOpenPrice) * 100;
  const absCurrentPercentChange = Math.abs(currentPercentChange);
  
  // Get the highest threshold level that has been triggered before (we need this even if previousPrice is null)
  const highestTriggeredLevel = await getHighestTriggeredThresholdLevel(alertId, thresholdPercent, symbol);
  
  // We need a previous percentage to detect a cross
  if (previousPrice === null) {
    // For first-time alerts (no previous price history), trigger if we cross the base threshold
    // But only if we haven't already triggered level 1 today
    const absThreshold = Math.abs(thresholdPercent);
    const currentThresholdLevel = Math.floor(absCurrentPercentChange / absThreshold);
    
    // First trigger: must cross to at least level 1, and we haven't triggered it yet today
    if (currentThresholdLevel >= 1 && currentThresholdLevel > highestTriggeredLevel) {
      const actualThreshold = currentThresholdLevel * absThreshold;
      console.log(`Percentage alert first trigger for ${symbol}: ${currentPercentChange.toFixed(2)}% (crossed ±${actualThreshold.toFixed(2)}%, level ${currentThresholdLevel})`);
      return true;
    }
    return false;
  }
  
  // Calculate previous percentage change from open
  const previousPercentChange = ((previousPrice - dailyOpenPrice) / dailyOpenPrice) * 100;
  const absPreviousPercentChange = Math.abs(previousPercentChange);
  
  const absThreshold = Math.abs(thresholdPercent);
  
  // Calculate threshold levels
  // Threshold level represents which multiple of the base threshold we're at
  // E.g., if threshold is 5%:
  //   - Level 0: 0-4.99% (below threshold)
  //   - Level 1: 5-9.99% (first threshold crossed = 5%)
  //   - Level 2: 10-14.99% (second threshold crossed = 10%)
  //   - Level 3: 15-19.99% (third threshold crossed = 15%)
  const previousThresholdLevel = Math.floor(absPreviousPercentChange / absThreshold);
  const currentThresholdLevel = Math.floor(absCurrentPercentChange / absThreshold);
  
  // Check if we've crossed a new threshold level that hasn't been triggered yet
  // Requirements:
  // 1. First time: trigger when crossing to level 1 (the base threshold of 5%)
  // 2. After that: only trigger when crossing to a level higher than what we've already triggered
  // 3. Only trigger when moving UP to a new level (not when moving down or staying the same)
  
  // Case 1: First trigger - must cross to at least level 1
  if (highestTriggeredLevel === 0 && currentThresholdLevel >= 1 && currentThresholdLevel > previousThresholdLevel) {
    const actualThreshold = currentThresholdLevel * absThreshold;
    console.log(`Percentage alert first trigger for ${symbol}: ${previousPercentChange.toFixed(2)}% → ${currentPercentChange.toFixed(2)}% (crossed ±${actualThreshold.toFixed(2)}%, level ${currentThresholdLevel})`);
    return true;
  }
  
  // Case 2: Subsequent triggers - only trigger when crossing to a level higher than previously triggered
  if (highestTriggeredLevel > 0 && currentThresholdLevel > highestTriggeredLevel && currentThresholdLevel > previousThresholdLevel) {
    const actualThreshold = currentThresholdLevel * absThreshold;
    console.log(`Percentage alert crossed new threshold for ${symbol}: ${previousPercentChange.toFixed(2)}% → ${currentPercentChange.toFixed(2)}% (crossed ±${actualThreshold.toFixed(2)}%, level ${currentThresholdLevel}, previous highest: ${highestTriggeredLevel})`);
    return true;
  }
  
  return false;
}

