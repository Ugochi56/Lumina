-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    provider VARCHAR(50) NOT NULL, -- 'google', 'facebook', 'apple'
    provider_id VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'weekly', 'monthly', 'yearly'
    photos_uploaded INTEGER DEFAULT 0,
    albums_created INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photos Table
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cloudinary_url VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'ready', 'failed'
    recommended_tool VARCHAR(50), -- 'upscale', 'restore', 'edit'
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Albums Table
CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    theme_tag VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Album_Photos Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS album_photos (
    album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
    photo_id INTEGER REFERENCES photos(id) ON DELETE CASCADE,
    PRIMARY KEY (album_id, photo_id)
);

-- Sessions Table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY NOT DEFERRABLE INITIALLY IMMEDIATE,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
