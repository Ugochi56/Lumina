require('dotenv').config();
const { Client } = require('pg');

async function migrateAdmin() {
    console.log('Starting Admin Migration...');

    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is missing in .env file.');
        process.exit(1);
    }

    const dbClient = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await dbClient.connect();
        console.log('Connected to Database. Adding is_admin column...');

        await dbClient.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
        `);

        console.log('is_admin column successfully added.');

        // Set specific user as admin
        const adminEmail = process.env.ADMIN_EMAIL || 'uofuzor72@gmail.com';

        const updateRes = await dbClient.query(`
            UPDATE users SET is_admin = true WHERE email = $1 RETURNING id;
        `, [adminEmail]);

        if (updateRes.rows.length > 0) {
            console.log(`Successfully elevated ${adminEmail} to Admin.`);
        } else {
            console.log(`Note: ${adminEmail} not found in the database yet. They will not be admin until the query is run again after they sign up.`);
        }

    } catch (err) {
        console.error('Error during migration:', err.message);
    } finally {
        await dbClient.end();
        console.log('Migration complete.');
    }
}

migrateAdmin();
