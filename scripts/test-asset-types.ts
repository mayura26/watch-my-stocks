import dotenv from 'dotenv';
import { dataManager } from '../lib/data-providers/manager';

dotenv.config({ path: '.env' });

async function testAssetTypes() {
  try {
    console.log('Testing improved asset type detection...\n');

    // Test different types of assets
    const testSymbols = [
      'AAPL',    // Stock
      'TSLA',    // Stock
      'BTC',     // Crypto
      'ETH',     // Crypto
      'ES=F',    // Futures (S&P 500)
      'NQ=F',    // Futures (Nasdaq)
      'GC=F',    // Futures (Gold)
      'CL=F',    // Futures (Crude Oil)
      'MSFT',    // Stock
      'NVDA',    // Stock
    ];

    console.log('Testing asset search for different symbols:');
    console.log('=' .repeat(50));

    for (const symbol of testSymbols) {
      try {
        console.log(`\n🔍 Testing: ${symbol}`);
        
        // Test search
        const searchResults = await dataManager.searchAssets(symbol);
        if (searchResults.length > 0) {
          const result = searchResults[0];
          console.log(`  📊 Symbol: ${result.symbol}`);
          console.log(`  📝 Name: ${result.name}`);
          console.log(`  🏷️  Type: ${result.type}`);
          console.log(`  🏢 Exchange: ${result.exchange}`);
        } else {
          console.log(`  ❌ No search results found`);
        }

        // Test quote
        const quote = await dataManager.getAssetQuote(symbol);
        if (quote) {
          console.log(`  💰 Price: $${quote.currentPrice.toFixed(2)}`);
          console.log(`  📈 Change: ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`);
        } else {
          console.log(`  ❌ No quote data available`);
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.log(`  ❌ Error: ${error}`);
      }
    }

    console.log('\n✅ Asset type detection test completed!');
  } catch (error) {
    console.error('❌ Asset type test failed:', error);
  } finally {
    process.exit(0);
  }
}

testAssetTypes();
