const express = require('express');
const router = express.Router();
const Replicate = require('replicate');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('../db'); // Assuming standard db connection export

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for processing file uploads in memory, with a 10MB limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB maximum file size
});

// Wrapper to elegantly handle Multer errors (e.g. file size limit hit)
const uploadSingle = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds the 10MB limit.' });
            }
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: 'An unknown upload error occurred.' });
        }
        next();
    });
};

// Replicate Client
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'lumina_uploads' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// 1. Initial Image Upload (Phase 1: Sync, Phase 2: Async)
router.post('/upload', uploadSingle, async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    try {
        const userId = req.user.id;

        // --- CHECK TIER LIMITS ---
        const userRes = await db.query('SELECT subscription_tier, photos_uploaded FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        const tier = user.subscription_tier;
        const photosUploaded = user.photos_uploaded;

        let limit = 15; // default free/weekly
        if (tier === 'monthly') limit = 20;
        if (tier === 'yearly') limit = Infinity;

        if (photosUploaded >= limit) {
            return res.status(403).json({ error: `Upload limit reached for ${tier} tier (${limit} photos max). Please upgrade to continue.` });
        }

        // --- PHASE 1: Synchronous Upload & DB Save ---
        // 1. Upload buffer to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
        const imageUrl = cloudinaryResult.secure_url;

        // 2. Save basic photo record to DB
        const insertRes = await db.query(
            `INSERT INTO photos (user_id, cloudinary_url, status) 
             VALUES ($1, $2, 'processing') RETURNING id`,
            [userId, imageUrl]
        );
        const photoId = insertRes.rows[0].id;

        // 3. Respond immediately to the frontend
        res.json({
            success: true,
            photoId: photoId,
            imageUrl: imageUrl,
            message: 'Image uploaded successfully. AI is analyzing the image...'
        });

        // --- PHASE 2: Asynchronous Background Processing ---
        setImmediate(async () => {
            try {
                console.log(`Phase 2 started for photo ${photoId}`);

                // 1. Replicate Auto-Tagging (salesforce/blip)
                const output = await replicate.run(
                    "salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d6a40d61",
                    {
                        input: {
                            image: imageUrl,
                            task: "image_captioning"
                        }
                    }
                );

                const caption = String(output).toLowerCase().trim();
                console.log(`Generated caption for photo ${photoId}: ${caption}`);

                // 2. Recommendation Engine (Upscale vs Restore vs Edit)
                let recommendedTool = 'upscale'; // default
                if (caption.includes('old') || caption.includes('scratch') || caption.includes('damage') || caption.includes('black and white') || caption.includes('sepia')) {
                    recommendedTool = 'restore';
                } else if (caption.includes('clear') || caption.includes('modern') || caption.includes('bright') || caption.includes('beautiful')) {
                    recommendedTool = 'edit';
                } else if (caption.includes('blur') || caption.includes('low') || caption.includes('pixel')) {
                    recommendedTool = 'upscale';
                }

                // 3. Smart Albums (Store tags array)
                const tagsArray = caption.split(' ').filter(word => word.length > 2);
                const tagsJson = JSON.stringify(tagsArray);

                // 4. Update DB photo status to 'ready'
                await db.query(
                    `UPDATE photos SET status = 'ready', recommended_tool = $1, tags = $2 WHERE id = $3`,
                    [recommendedTool, tagsJson, photoId]
                );
                console.log(`Phase 2 completed successfully for photo ${photoId}`);

            } catch (bgError) {
                console.error(`Background processing failed for photo ${photoId}:`, bgError);
                await db.query(`UPDATE photos SET status = 'failed' WHERE id = $1`, [photoId]);
            }
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Internal server error during upload.' });
    }
});

// 2. Polling Endpoint for AI Recommendation Status
router.get('/photos/:id/status', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const photoId = req.params.id;
        const userId = req.user.id; // Ensure user only polls their own photos

        const photoRes = await db.query('SELECT status, recommended_tool, tags FROM photos WHERE id = $1 AND user_id = $2', [photoId, userId]);

        if (photoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const photo = photoRes.rows[0];
        res.json({
            status: photo.status,
            recommended_tool: photo.recommended_tool,
            tags: photo.tags
        });

    } catch (error) {
        console.error('Status Error:', error);
        res.status(500).json({ error: 'Failed to retrieve photo status.' });
    }
});

// 3. Replicate Enhance (Protected)
router.post('/enhance', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { imageUrl, tool, photoId } = req.body;
        const userId = req.user.id;

        if (!imageUrl || !tool || !photoId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // --- CHECK TIER & VALIDATE TOOL ---
        const userRes = await db.query('SELECT subscription_tier FROM users WHERE id = $1', [userId]);
        const tier = userRes.rows[0].subscription_tier;

        if ((tier === 'free' || tier === 'weekly') && tool !== 'upscale') {
            return res.status(403).json({ error: `The ${tool} tool requires a Monthly or Yearly subscription.` });
        }

        // --- MODEL ROUTING ---
        let modelString = "";
        let inputData = { image: imageUrl };

        switch (tool) {
            case 'upscale':
                // Super Resolution (e.g., Real-ESRGAN)
                modelString = "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b";
                inputData.scale = 2; // Default scale
                break;
            case 'restore':
                // Face / Photo Restoration (e.g., GFPGAN or CodeFormer)
                // Using TencentARC GFPGAN as an example
                modelString = "tencentarc/gfpgan:9283608cb6b7ecca216c8e3128fb9a98ac20f4c0ee1517f858888eb1beb99c2d";
                inputData.scale = 2;
                break;
            case 'edit':
                // Image Editing / Magic Eraser / InstructPix2Pix
                // Using a generic instruct model for "edit" as placeholder
                modelString = "timbrooks/instruct-pix2pix:30c1d0b916a6f8efce20d220800b6528d2bc2dcbbbc98efaeab5b68df56612cb";
                inputData.prompt = "enhance quality, vivid colors, modern"; // Generic edit prompt
                break;
            default:
                return res.status(400).json({ error: 'Invalid tool selected' });
        }

        console.log(`Executing ${tool} model for user ${userId}...`);

        // --- EXECUTE REPLICATE API ---
        const output = await replicate.run(modelString, { input: inputData });

        // Some models return arrays of URLs, some return single strings. Handle both.
        let finalImageUrl = Array.isArray(output) ? output[output.length - 1] : output;

        // --- WATERMARKING LOGIC (Free/Weekly) ---
        if (tier === 'free' || tier === 'weekly') {
            // Apply a Cloudinary Watermark via transformation
            try {
                // We must upload the Replicate output to Cloudinary to apply the transformation
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'lumina_results',
                        transformation: [
                            // Note: In production, you would upload a watermark image and overlay it
                            // e.g., {overlay: "lumina_watermark", gravity: "bottom_right", opacity: 50}
                            { effect: "art:primavera" } // Placeholder effect instead of actual watermark for demo
                        ]
                    },
                    (error, result) => {
                        if (error) throw error;
                        // Return transformed URL
                        res.json({ output: result.secure_url });
                    }
                );

                // Fetch image from Replicate and pipe to Cloudinary
                const response = await fetch(finalImageUrl);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                uploadStream.end(buffer);
                return; // End execution here as response is sent inside callback
            } catch (wmError) {
                console.error("Watermarking failed:", wmError);
                // Fallback to non-watermarked if it fails for some reason
                return res.json({ output: finalImageUrl });
            }
        }

        // If Monthly/Yearly, return directly
        res.json({ output: finalImageUrl });

    } catch (error) {
        console.error('Enhancement Error:', error);
        res.status(500).json({ error: 'Enhancement failed' });
    }
});

// 2. Mock Checkout Endpoint
router.get('/checkout', (req, res) => {
    const tier = req.query.tier;

    // In a real application, the backend would create a Stripe Checkout Session here
    // and return the Session ID or URL to redirect to.
    // For now, we simulate the redirect with a simple HTML response.
    res.send(`
        <html>
            <head>
                <title>Redirecting to Secure Checkout...</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body class="bg-gray-900 text-white flex flex-col items-center justify-center h-screen font-sans">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange mb-6"></div>
                <h1 class="text-2xl md:text-4xl font-bold mb-4">Secure Checkout</h1>
                <p class="text-gray-400 text-lg text-center px-4">Redirecting you to the payment gateway for the <span class="text-white font-bold capitalize">${tier || 'selected'}</span> plan...</p>
                <p class="text-sm text-gray-500 mt-8">(This is a simulated endpoint for testing purposes)</p>
                <button onclick="window.history.back()" class="mt-8 text-orange hover:text-white underline">Go Back</button>
            </body>
        </html>
    `);
});

module.exports = router;
