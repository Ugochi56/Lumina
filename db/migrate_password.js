require('dotenv').config();
const { Client } = require('pg');

async function migrateDatabase() {
    console.log('🔄 Starting Database Migration...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL is missing in .env file.');
        process.exit(1);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();

        console.log('📂 Altering users table...');

        // 1. Add password column (nullable)
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);`);

        // 2. Make provider_id nullable (for email users)
        await client.query(`ALTER TABLE users ALTER COLUMN provider_id DROP NOT NULL;`);

        // 3. Make name nullable (just in case)
        await client.query(`ALTER TABLE users ALTER COLUMN name DROP NOT NULL;`);

        console.log('✅ Users table updated successfully.');
    } catch (err) {
        console.error('❌ Error updating database:', err.message);
    } finally {
        await client.end();
    }
}

migrateDatabase();
