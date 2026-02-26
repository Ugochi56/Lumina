const express = require('express');
const router = express.Router();
const db = require('../db');

// Secure Middleware: Verify User is Authenticated AND an Admin
const isAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    try {
        const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || result.rows[0].is_admin !== true) {
            return res.status(403).json({ error: "Forbidden. Admin access required." });
        }
        next();
    } catch (err) {
        console.error("Admin Check Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

// Apply middleware to all routes in this router
router.use(isAdmin);

// 1. Get High-Level System Metrics
router.get('/stats', async (req, res) => {
    try {
        // Total Users
        const userRes = await db.query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(userRes.rows[0].count, 10);

        // Tier Breakdown
        const tierRes = await db.query(`
            SELECT subscription_tier, COUNT(*) 
            FROM users 
            GROUP BY subscription_tier
        `);
        const tierBreakdown = { free: 0, weekly: 0, monthly: 0, yearly: 0 };
        tierRes.rows.forEach(row => {
            tierBreakdown[row.subscription_tier] = parseInt(row.count, 10);
        });

        // Total Photos & Enhanced Photos
        const photoRes = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN enhanced_url IS NOT NULL THEN 1 ELSE 0 END) as enhanced
            FROM photos
        `);
        const totalPhotos = parseInt(photoRes.rows[0].total, 10);
        const totalEnhanced = parseInt(photoRes.rows[0].enhanced || 0, 10);

        // Tool Breakdown
        const toolRes = await db.query(`
            SELECT recommended_tool, COUNT(*) 
            FROM photos 
            WHERE recommended_tool IS NOT NULL
            GROUP BY recommended_tool
        `);
        const toolBreakdown = { upscale: 0, restore: 0, edit: 0, lowlight: 0 };
        toolRes.rows.forEach(row => {
            toolBreakdown[row.recommended_tool] = parseInt(row.count, 10);
        });

        // Recent Photos Grid
        const recentPhotosRes = await db.query(`
            SELECT id, cloudinary_url, enhanced_url, recommended_tool, created_at 
            FROM photos 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        res.json({
            totalUsers,
            totalPhotos,
            totalEnhanced,
            tierBreakdown,
            toolBreakdown,
            recentPhotos: recentPhotosRes.rows
        });
    } catch (err) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ error: "Failed to fetch stats." });
    }
});

// 2. Get All Users Table
router.get('/users', async (req, res) => {
    try {
        const usersRes = await db.query(`
            SELECT id, name, email, provider, subscription_tier as tier, photos_uploaded, created_at
            FROM users 
            ORDER BY created_at DESC
        `);
        res.json({ users: usersRes.rows });
    } catch (err) {
        console.error("Admin Users Error:", err);
        res.status(500).json({ error: "Failed to fetch users." });
    }
});

module.exports = router;
