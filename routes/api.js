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

// 2. Check Auth Status (Can be here or in auth routes, kept in auth for semantic reasons but good to have API status too)
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
