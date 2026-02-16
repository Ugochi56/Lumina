require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🔄 Starting Database Setup...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL is missing in .env file.');
        console.log('👉 Example: postgresql://postgres:password@localhost:5432/lumina');
        process.exit(1);
    }

    // Parse connection string to connect to default 'postgres' db first
    // (to create the specific database if it doesn't exist)
    const urlParts = new URL(process.env.DATABASE_URL);
    const dbName = urlParts.pathname.split('/')[1];

    // Connection to 'postgres' (default db)
    const rootUrl = `${urlParts.protocol}//${urlParts.username}:${urlParts.password}@${urlParts.hostname}:${urlParts.port}/postgres`;

    const rootClient = new Client({ connectionString: rootUrl });

    try {
        await rootClient.connect();

        // Check if DB exists
        const res = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rowCount === 0) {
            console.log(`✨ Database '${dbName}' not found. Creating...`);
            await rootClient.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Database '${dbName}' created.`);
        } else {
            console.log(`ℹ️  Database '${dbName}' already exists.`);
        }
    } catch (err) {
        console.error('❌ Error connecting to Postgres root:', err.message);
        console.log('💡 Tip: Check your username/password in database_url.');
        process.exit(1);
    } finally {
        await rootClient.end();
    }

    // Now connect to the new DB and run schema
    const dbClient = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await dbClient.connect();
        console.log('📂 Applying schema...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await dbClient.query(schemaSql);
        console.log('✅ Tables created/verified successfully.');
        console.log('🎉 Setup complete! You can now run "node server.js"');
    } catch (err) {
        console.error('❌ Error applying schema:', err.message);
    } finally {
        await dbClient.end();
    }
}

setupDatabase();
