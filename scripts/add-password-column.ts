import dotenv from 'dotenv';
import client from '../lib/db';

// Load environment variables for the script
dotenv.config({ path: '.env' });

async function main() {
  try {
    console.log('Adding password column to users table...');
    
    // Add password column to existing users table
    await client.execute(`
      ALTER TABLE users ADD COLUMN password TEXT
    `);
    
    console.log('Password column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding password column:', error);
    process.exit(1);
  }
}

main();
