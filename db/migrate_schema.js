require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        console.log("Connecting to the database...");

        console.log("Adding 'subject' column to 'photos' table...");
        await pool.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS subject VARCHAR(100) DEFAULT 'General';`);

        console.log("Migration successful! Added 'subject' column.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await pool.end();
    }
}

runMigration();
