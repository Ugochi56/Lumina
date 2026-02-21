require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        console.log('Running migration...');

        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS photos_uploaded INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS albums_created INTEGER DEFAULT 0;
        `);

        console.log('Migration successful: Added missing columns to users table.');
    } catch (e) {
        console.error('Migration failed', e);
    } finally {
        await client.end();
    }
}

migrate();
