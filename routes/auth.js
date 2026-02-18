const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const pool = require('../db');

// 1. Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (email, password, name, provider, provider_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [email, hashedPassword, name || 'User', 'local', 'local']
        );

        // Login immediately
        req.login(result.rows[0], (err) => {
            if (err) throw err;
            res.redirect('/login.html'); // Redirect to app
        });

    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation (email exists)
            return res.redirect('/login.html?error=Email already exists');
        }
        console.error(err);
        res.redirect('/login.html?error=Registration failed');
    }
});

// 2. Login Route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            // Redirect with the specific error message from LocalStrategy
            return res.redirect('/login.html?error=' + encodeURIComponent(info.message));
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            return res.redirect('/login.html');
        });
    })(req, res, next);
});

// 3. Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => res.redirect('/login.html') // Successful auth: go to app
);

// 4. Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login.html' }),
    (req, res) => res.redirect('/login.html')
);

// 5. Apple
router.get('/apple', passport.authenticate('apple'));
router.post('/apple/callback', // Apple uses POST
    passport.authenticate('apple', { failureRedirect: '/login.html' }),
    (req, res) => res.redirect('/login.html')
);

// 6. Logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/index.html');
    });
});

// 7. Check Auth Status (API)
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
