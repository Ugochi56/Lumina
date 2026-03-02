<h1 align="center">
  <br>
  Lumina AI Photo Enhancer
  <br>
</h1>

<h4 align="center">An enterprise-grade, full-stack AI photo enhancement web application orchestrating LLaMA-3, BLIP, and ESRGAN models.</h4>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#ai-architecture">AI Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation--setup">Installation</a> •
  <a href="#evaluation-framework">Evaluation Framework</a>
</p>

## Overview

**Lumina Web** is a production-ready application that allows users to seamlessly upload, automatically categorize, and geometrically enhance their photographs using state-of-the-art AI. The system dynamically routes images through a network of Replicate models to upscale, denoise, color grade, or fix low-light photography. 

The application utilizes a sleek, responsive, glass-morphic Tailwind CSS frontend heavily inspired by modern macOS design paradigms.

## Key Features

* 🔐 **Secure OAuth Authentication:** Google OAuth via Passport.js & PostgreSQL.
* ✨ **AI Suite:** `Real-ESRGAN` (Upscaling), `CodeFormer` (Restoration), and `Night-Enhancement`.
* 🧠 **Smart Albums:** Salesforce BLIP & Meta LLaMA-3 intelligently auto-tag and group images.
* 💳 **Subscription Gateway:** Interactive pricing modal mapped to user limits.
* ☁️ **Permanent Cloud Storage:** Images proxied securely to Cloudinary with automatic watermarking.
* 📊 **Admin Dashboard:** Secure `/admin.html` tracking real-time KPIs and system telemetry. 



## Tech Stack

* **Frontend:** Vanilla HTML5, JavaScript (ES6+), **Tailwind CSS**, PostCSS
* **Backend:** Node.js, Express.js (REST API)
* **Database:** **PostgreSQL** (via `pg` pool), `connect-pg-simple` (Session Store)
* **Authentication:** Passport.js (Google Strategy)
* **Cloud Storage:** Cloudinary API
* **AI Provider:** Replicate API
* **Data Science (IQA):** Python 3, OpenCV, pandas, scikit-image, ReportLab

---

## Installation & Setup

To clone and run this application locally, you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with npm) installed on your computer.

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/Lumina.git
cd Lumina
```

### 2. Install Dependencies
```bash
npm install
```

### 3. PostgreSQL Database Setup
Ensure you have a local or cloud instance of PostgreSQL running. Create a new database named `lumina`.

Run the automated setup scripts to inject the secure UUID-based schema:
```bash
node db/setup.js
node db/migrate_eval.js
```

### 4. Environment Variables
Create a `.env` file in the root directory and populate it with your confidential API Keys:
```env
# Server
PORT=3000
SESSION_SECRET=your_super_secret_string

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lumina

# OAuth Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback

# APIs
REPLICATE_API_TOKEN=your_replicate_token
CLOUDINARY_URL=cloudinary://YOUR_KEY:YOUR_SECRET@YOUR_CLOUD_NAME
```

### 5. Start the Application
```bash
# Starts the server via nodemon on localhost:3000
npm start
```

---

## Evaluation Framework

Lumina features a robust telemetry and Image Quality Assessment (IQA) backend.

The backend inherently measures the latency (`processing_time_ms`) of every Replicate API call. Additionally, users can leave subjective feedback via a Thumbs Up/Down widget on the Frontend slider.

### Objective Quality Mathematical Scoring
You can mathematically score the AI generations against geometric and spatial distortion properties. 
Ensure you have installed the Python dependencies:
```bash
pip install -r scripts/requirements.txt
```

**Run the Evaluator:**
```bash
python scripts/eval_quality.py
```

**Compile PDF Report:**
```bash
python scripts/generate_report.py
```

---

> *Note: For security reasons, the `/admin.html` dashboard natively redirects users away unless their PostgreSQL `users` row has the `is_admin` boolean precisely set to TRUE.*
