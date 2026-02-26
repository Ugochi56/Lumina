const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const path = require('path');
const pool = require('./db'); // Import shared pool

require('dotenv').config();
require('./config/passport')(passport); // Configure Passport

const app = express();
const PORT = process.env.PORT || 3000;

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

// --- ROUTES ---
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Explicit Route for enhance page to ensure it exists alongside static serving
app.get('/enhance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/enhance.html'));
});

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/login.html')); // Entry point
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
