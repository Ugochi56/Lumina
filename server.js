require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const { Pool } = require('pg');
const path = require('path');
const Replicate = require('replicate');

// --- Strategies ---
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Replicate Client
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src'))); // Serve static files from 'src'
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serve images from root 'images' folder

// Session Setup
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// Passport Init
app.use(passport.initialize());
app.use(passport.session());

// Passport Serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});

// --- GOOGLE STRATEGY ---
if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user exists
                let result = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', ['google', profile.id]);
                if (result.rows.length > 0) {
                    return done(null, result.rows[0]);
                } else {
                    // Create user
                    const email = profile.emails[0].value;
                    const name = profile.displayName;
                    result = await pool.query(
                        'INSERT INTO users (email, name, provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
                        [email, name, 'google', profile.id]
                    );
                    return done(null, result.rows[0]);
                }
            } catch (err) {
                return done(err);
            }
        }));
}

// --- FACEBOOK STRATEGY ---
if (process.env.FACEBOOK_APP_ID) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let result = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', ['facebook', profile.id]);
                if (result.rows.length > 0) {
                    return done(null, result.rows[0]);
                } else {
                    const email = profile.emails ? profile.emails[0].value : null; // FB might not return email
                    const name = `${profile.name.givenName} ${profile.name.familyName}`;
                    result = await pool.query(
                        'INSERT INTO users (email, name, provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
                        [email, name, 'facebook', profile.id]
                    );
                    return done(null, result.rows[0]);
                }
            } catch (err) {
                return done(err);
            }
        }));
}

// --- APPLE STRATEGY ---
if (process.env.APPLE_CLIENT_ID) {
    passport.use(new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH, // Path to .p8 file
        callbackURL: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback',
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, idToken, profile, done) => {
        try {
            // Apple only returns user info (name/email) on the FIRST login. 
            // Logic here needs to handle that or use the idToken to decode email.
            const providerId = idToken.sub;
            let result = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', ['apple', providerId]);

            if (result.rows.length > 0) {
                return done(null, result.rows[0]);
            } else {
                // Basic placeholder. Real implementation needs to decode JWT for email if profile is missing
                const email = profile ? profile.email : `apple_${providerId}@placeholder.com`;
                const name = profile && profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : 'Apple User';

                result = await pool.query(
                    'INSERT INTO users (email, name, provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
                    [email, name, 'apple', providerId]
                );
                return done(null, result.rows[0]);
            }
        } catch (err) {
            return done(err);
        }
    }));
}


// --- Routes ---

// 1. Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => res.redirect('/index.html') // Successful auth
);

// 2. Facebook
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login.html' }),
    (req, res) => res.redirect('/index.html')
);

// 3. Apple
app.get('/auth/apple', passport.authenticate('apple'));
app.post('/auth/apple/callback', // Apple uses POST
    passport.authenticate('apple', { failureRedirect: '/login.html' }),
    (req, res) => res.redirect('/index.html')
);

// Logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/index.html');
    });
});

// API: Check Auth Status
app.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

// API: Replicate Enhance (Protected)
app.post('/api/enhance', async (req, res) => {
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

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/login.html')); // Entry point
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
