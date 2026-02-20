const express = require('express');
const router = express.Router();
const Replicate = require('replicate');

// Replicate Client
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// 1. Replicate Enhance (Protected)
router.post('/enhance', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { imageUrl } = req.body;
        // Example using a popular definition (Real-ESRGAN or similar)
        // Replace with the specific model version you want to use
        const output = await replicate.run(
            "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
            { input: { image: imageUrl } }
        );
        res.json({ output });
    } catch (error) {
        console.error(error);
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
