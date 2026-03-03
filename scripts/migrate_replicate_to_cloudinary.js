require('dotenv').config();
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');

// Initialize DB (Re-using standard .env parameters)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrateImages() {
    let client;
    try {
        client = await pool.connect();

        console.log("Searching for vulnerable Replicate URLs in the database...");

        // Find all photos where the enhanced_url points to replicate (meaning the 10MB upload originally failed)
        const result = await client.query(`
            SELECT id, enhanced_url 
            FROM photos 
            WHERE enhanced_url LIKE '%replicate.delivery%'
        `);

        const photos = result.rows;

        if (photos.length === 0) {
            console.log("No vulnerable photos found. The database is completely clean.");
            process.exit(0);
        }

        console.log(`Found ${photos.length} photos stuck on replicate.delivery. Beginning compression and migration...`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            console.log(`\nProcessing ${i + 1}/${photos.length} (Photo ID: ${photo.id})...`);

            try {
                // 1. Download the massive lossless PNG from Replicate
                const response = await fetch(photo.enhanced_url);
                if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const originalBuffer = Buffer.from(arrayBuffer);

                console.log(`Original size: ${(originalBuffer.length / 1024 / 1024).toFixed(2)} MB`);

                // 2. Compress it with Sharp
                const compressedBuffer = await sharp(originalBuffer).jpeg({ quality: 90 }).toBuffer();
                console.log(`Compressed size: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`);

                // 3. Upload to Cloudinary using Promises
                const cloudinaryUrl = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'lumina_results' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    uploadStream.end(compressedBuffer);
                });

                console.log(`Successfully hosted on Cloudinary: ${cloudinaryUrl}`);

                // 4. Update the DB
                await client.query(`
                    UPDATE photos 
                    SET enhanced_url = $1 
                    WHERE id = $2
                `, [cloudinaryUrl, photo.id]);

                console.log(`Database updated for Photo ${photo.id}.`);
                successCount++;

            } catch (err) {
                console.error(`Failed to migrate Photo ${photo.id}: ${err.message}`);
                failCount++;
            }
        }

        console.log("\n--- MIGRATION COMPLETE ---");
        console.log(`Successfully rescued and archived: ${successCount}`);
        console.log(`Failed to rescue: ${failCount}`);

    } catch (e) {
        console.error("Fatal Error during Migration:", e);
    } finally {
        if (client) client.release();
        await pool.end();
        process.exit(0);
    }
}

migrateImages();
