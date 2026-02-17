const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple');
const bcrypt = require('bcrypt');
const pool = require('../db');

module.exports = function (passport) {

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

    // --- LOCAL STRATEGY ---
    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
        async (email, password, done) => {
            try {
                const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                if (result.rows.length === 0) {
                    return done(null, false, { message: 'Incorrect email.' });
                }

                const user = result.rows[0];

                // If user logged in with OAuth before, they might not have a password
                if (!user.password) {
                    return done(null, false, { message: 'Please log in with your social account.' });
                }

                const match = await bcrypt.compare(password, user.password);
                if (!match) {
                    return done(null, false, { message: 'Incorrect password.' });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

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
                const providerId = idToken.sub;
                let result = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', ['apple', providerId]);

                if (result.rows.length > 0) {
                    return done(null, result.rows[0]);
                } else {
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
};
