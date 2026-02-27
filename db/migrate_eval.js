const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    console.log("Starting Evaluation Telemetry Database Migration...");

    if (!process.env.DATABASE_URL) {
        console.error("Error: DATABASE_URL is missing in .env file.");
        process.exit(1);
    }

    try {
        console.log("Connected to Database. Adding Evaluation Columns to 'photos' table...");

        // 1. Processing Time (Latency)
        await pool.query(`
            ALTER TABLE photos 
            ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0;
        `);
        console.log("Added processing_time_ms column.");

        // 2. User Satisfaction Rating (-1 to 1)
        await pool.query(`
            ALTER TABLE photos 
            ADD COLUMN IF NOT EXISTS user_rating SMALLINT DEFAULT 0;
        `);
        console.log("Added user_rating column.");

        // 3. SSIM Score (Structural Similarity)
        await pool.query(`
            ALTER TABLE photos 
            ADD COLUMN IF NOT EXISTS ssim_score NUMERIC(5, 4) DEFAULT NULL;
        `);
        console.log("Added ssim_score column.");

        // 4. BRISQUE Score (No-reference spatial quality)
        await pool.query(`
            ALTER TABLE photos 
            ADD COLUMN IF NOT EXISTS brisque_score NUMERIC(7, 4) DEFAULT NULL;
        `);
        console.log("Added brisque_score column.");

        console.log("Evaluation Framework Migration complete.");
        process.exit(0);

    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
