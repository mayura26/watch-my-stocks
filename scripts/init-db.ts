import dotenv from 'dotenv';
import { initializeDatabase } from '../lib/db';

// Load environment variables for the script
dotenv.config({ path: '.env' });

async function main() {
  try {
    console.log('Initializing database...');
    console.log('Database URL:', process.env.TURSO_DATABASE_URL);
    await initializeDatabase();
    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

main();
