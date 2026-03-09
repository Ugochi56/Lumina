require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function applyFixes() {
    console.log('Applying Lumina Database Schema Fixes...\n');
    try {
        // 1. Add password column to users if it doesn't exist
        console.log('1. Checking users table for missing password column...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS password VARCHAR(255);
        `);
        console.log('   ✅ Password column ensured.');

        // 2. Fix numeric overflow for scores
        console.log('\n2. Updating precision for ssim_score and brisque_score...');
        await pool.query(`
            ALTER TABLE photos 
            ALTER COLUMN ssim_score TYPE NUMERIC(10,4),
            ALTER COLUMN brisque_score TYPE NUMERIC(10,4);
        `);
        console.log('   ✅ Numeric precision increased to prevent overflow.');

        console.log('\nAll schema fixes applied successfully!');
    } catch (error) {
        console.error('\n❌ Database Error:', error.message);
    } finally {
        await pool.end();
    }
}

applyFixes();
