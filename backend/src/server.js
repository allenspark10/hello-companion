const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const manifestRoute = require('./routes/manifest');
const catalogRoute = require('./routes/catalog');
const metaRoute = require('./routes/meta');
const streamRoute = require('./routes/stream');
const recentRoute = require('./routes/recent');
const indexRoute = require('./routes/index');
const scheduleRoute = require('./routes/schedule');
const ongoingRoute = require('./routes/ongoing');
const ogRoute = require('./routes/og');
const connectDB = require('./config/database');
const socialMetaMiddleware = require('./middleware/socialMeta');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "DELETE"],
  credentials: true,
}));

app.use(express.json());

// Create temp directory
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Connect to MongoDB
connectDB();

// API Routes with /api prefix (mimics nginx proxy behavior)
app.use('/api/manifest', manifestRoute);
app.use('/api/catalog', catalogRoute);
app.use('/api/meta', metaRoute);
app.use('/api/stream', streamRoute);
app.use('/api/recent', recentRoute);
app.use('/api/index', indexRoute);
app.use('/api/schedule', scheduleRoute);
app.use('/api/ongoing', ongoingRoute);
app.use('/api/og', ogRoute); // Public OpenGraph endpoint for social media previews

// =============================================================
// FILE TO LINK BOT - REDIRECT ROUTES (MUST BE BEFORE STATIC FILES!)
// =============================================================
// These routes handle redirects from the Telegram bot
// Format: /download?path=TOKEN or /watch?path=TOKEN

const BOT_SERVER_URL = process.env.BOT_SERVER_URL || 'https://animeshrinexyz-92535430c5ef.herokuapp.com';

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Direct streaming mode - No processing',
    timestamp: new Date().toISOString(),
    addon: process.env.ADDON_URL
  });
});

// Styled redirect page HTML
const getRedirectPage = (mode, token, redirectUrl) => {
  const isWatch = mode === 'watch';
  const title = isWatch ? '🎬 Preparing Stream' : '🚀 Preparing Download';
  const statusText = isWatch ? 'Loading video player...' : 'Redirecting to download...';
  const buttonText = isWatch ? 'Click Here to Watch' : 'Click Here to Download';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      background-size: 400% 400%;
      animation: gradientBG 15s ease infinite;
      color: white;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    @keyframes gradientBG {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      animation: slideIn 0.8s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 { font-size: 24px; margin-bottom: 20px; text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5); }
    .loader {
      width: 80px; height: 80px;
      border: 8px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      margin: 30px auto;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { font-size: 18px; margin: 20px 0; opacity: 0.9; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 15px 40px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      border: 2px solid rgba(255, 255, 255, 0.3);
      transition: all 0.3s ease;
    }
    .btn:hover { transform: translateY(-3px); box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6); }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="loader"></div>
    <p class="status">${statusText}</p>
    <a href="${redirectUrl}" class="btn">${buttonText}</a>
  </div>
  <script>
    setTimeout(() => { window.location.href = "${redirectUrl}"; }, 1000);
  </script>
</body>
</html>`;
};

// Styled error page with countdown redirect to homepage
const getErrorPage = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>❌ Invalid Link</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 50%, #8e44ad 100%);
      background-size: 400% 400%;
      animation: gradientBG 15s ease infinite;
      color: white;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    @keyframes gradientBG {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      animation: slideIn 0.8s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon { font-size: 80px; margin-bottom: 20px; }
    h1 { font-size: 28px; margin-bottom: 15px; text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5); }
    .message { font-size: 16px; margin: 15px 0; opacity: 0.9; }
    .countdown { font-size: 18px; margin: 20px 0; font-weight: bold; }
    .countdown span { 
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 10px;
      min-width: 40px;
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 15px 40px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      border: 2px solid rgba(255, 255, 255, 0.3);
      transition: all 0.3s ease;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.3); transform: translateY(-3px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>Invalid Link</h1>
    <p class="message">The link you're trying to access is invalid or has expired.</p>
    <p class="countdown">Redirecting to homepage in <span id="timer">5</span> seconds...</p>
    <a href="/" class="btn">🏠 Go to Homepage Now</a>
  </div>
  <script>
    let seconds = 5;
    const timerEl = document.getElementById('timer');
    const countdown = setInterval(() => {
      seconds--;
      timerEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(countdown);
        window.location.href = '/';
      }
    }, 1000);
  </script>
</body>
</html>`;
};

// Download redirect route - Instant 302 redirect for DDL/leech bot compatibility
app.get('/download', (req, res) => {
  const token = req.query.path || req.query.token;

  if (!token) {
    return res.status(400).send(getErrorPage());
  }

  const redirectUrl = `${BOT_SERVER_URL}/download?path=${token}`;
  res.redirect(302, redirectUrl);
});

// Watch/Stream redirect route - Instant 302 redirect
app.get('/watch', (req, res) => {
  const token = req.query.path || req.query.token;

  if (!token) {
    return res.status(400).send(getErrorPage());
  }

  const redirectUrl = `${BOT_SERVER_URL}/watch?path=${token}`;
  res.redirect(302, redirectUrl);
});

// Test CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working properly!',
    origin: req.headers.origin
  });
});

// Sitemap route - proxy to API
app.get('/sitemap.xml', (req, res) => {
  // Redirect to the API sitemap endpoint
  res.redirect(301, '/api/index/sitemap.xml');
});

// Social media bot middleware - MUST be BEFORE static files!
// This intercepts requests from Telegram, Facebook, Twitter bots
// and serves custom HTML with OG meta tags
app.use(socialMetaMiddleware);

// Serve frontend static files AFTER social meta middleware
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// Catch-all: serve React app (MUST BE LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on port ${PORT}`);
  console.log(`📁 Temp directory: ${tempDir}`);
  console.log(`🔗 Addon URL: ${process.env.ADDON_URL}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✅ Mode: Direct streaming (No HLS/FFmpeg processing)`);
  console.log(`\n✨ Ready to serve direct Heroku URLs!\n`);
});

module.exports = app;
