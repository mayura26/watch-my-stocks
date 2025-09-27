import dotenv from 'dotenv';
import { dataManager } from '../lib/data-providers/manager';

// Load environment variables
dotenv.config({ path: '.env' });

async function testFinnhub() {
  try {
    console.log('Testing Finnhub API integration...\n');
    console.log('Environment variables:');
    console.log('FINNHUB_API_KEY:', process.env.FINNHUB_API_KEY ? 'Set' : 'Not set');
    console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'Set' : 'Not set');
    console.log('');

    // Test provider health
    console.log('1. Checking provider health...');
    const health = await dataManager.getProviderHealth();
    console.log('Provider health:', health);
    
    // Check current provider
    const currentProvider = dataManager.getCurrentProvider();
    console.log('Current provider:', currentProvider?.name || 'None');

    // Test asset search
    console.log('\n2. Testing asset search...');
    const searchResults = await dataManager.searchAssets('AAPL');
    console.log('Search results for AAPL:', searchResults);

    // Test asset quote
    console.log('\n3. Testing asset quote...');
    const quote = await dataManager.getAssetQuote('AAPL');
    console.log('Quote for AAPL:', quote);

    // Test asset details
    console.log('\n4. Testing asset details...');
    const details = await dataManager.getAssetDetails('AAPL');
    console.log('Details for AAPL:', details);

    console.log('\n✅ Finnhub API test completed successfully!');
  } catch (error) {
    console.error('❌ Finnhub API test failed:', error);
  } finally {
    process.exit(0);
  }
}

testFinnhub();
