## Deploying on your VPS with your Hostinger domain

This project now ships with production-ready Docker setup:

- Frontend: React app built and served by Nginx, proxies `/api` to backend
- Backend: Node/Express app
- One command deploy with `docker-compose`

### 1) Point your domain to the VPS

- In Hostinger DNS for your domain, create an A record:
  - Name: `@` (or your chosen subdomain like `app`)
  - Value: your VPS public IP
  - TTL: default

Propagation can take up to 30 minutes (often faster).

### 2) Install Docker on the VPS (Ubuntu/Debian)

```bash
# Install Docker (official script)
curl -fsSL https://get.docker.com | sh

# Add current user to docker group (avoid using sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose V2 Plugin (recommended method)
sudo apt update
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Optional: Create alias for backward compatibility
echo 'alias docker-compose="docker compose"' >> ~/.bashrc
source ~/.bashrc
```

**Note:** Modern Docker (2023+) uses `docker compose` (with a space) instead of the old `docker-compose` (with a hyphen). The alias above ensures both commands work.


### 3) Copy the project to the VPS

```bash
scp -r ./ buntu@YOUR_VPS_IP:~/stream
ssh buntu@YOUR_VPS_IP
cd ~/stream
```

### 4) Configure environment variables (optional)

Create a `.env` file in the project root to override defaults:

```env
# Backend will read these from the compose environment
ADDON_URL=https://your-addon.example.com
FRONTEND_URL=https://yourdomain.com

# Frontend build-time API base (defaults to /api)
REACT_APP_API_URL=/api
```

### 5) Build and run

```bash
docker compose up -d --build
```

This will:

- Build and start the backend on internal port 3001 (not publicly exposed)
- Build and start the frontend on port 80 and reverse-proxy `/api` to backend

Visit: `http://YOUR_DOMAIN` (or your VPS IP) to verify.

### 6) Enable HTTPS (recommended)

Option A: Use your host Nginx/Caddy/Traefik on the VPS and reverse-proxy to `frontend:80`.

Quickest path (Caddy - auto TLS):

```bash
docker run -d \
  --name caddy \
  -p 80:80 -p 443:443 \
  -v caddy_data:/data -v caddy_config:/config \
  -v /var/run/docker.sock:/var/run/docker.sock \
  caddy:2 caddy reverse-proxy --from yourdomain.com --to 127.0.0.1:80
```

Option B: Install certbot with a host nginx config and proxy to `http://127.0.0.1:80`.

### 7) Logs and updates

```bash
docker compose logs -f frontend
docker compose logs -f backend

# Rebuild after code changes
docker compose up -d --build

# Stop
docker compose down
```

### Development vs Production

- Local dev as before:
  - Frontend: `cd frontend && npm start`
  - Backend: `cd backend && npm run dev`
- Production: use `docker compose` above. The frontend will call the backend via same-origin `/api`.

### Contact and DMCA

- Public contact: `mailto:animeshrine@proton.me`
- Add links in the UI (already added) so users can click to open their email client.
- If you want a contact form instead of mailto, use a serverless form provider (e.g., `https://formspree.io/`, `https://web3forms.com/`) or run your own SMTP handler behind `/api/contact`.
  - Example flow: frontend POSTs `{ name, email, subject, message }` to backend → backend sends email via SMTP (e.g., Mailgun/SendGrid) → respond 200.

```

## 📦 Installation

### Prerequisites
- Node.js 18+
- FFmpeg installed
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

**Required packages:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "fluent-ffmpeg": "^2.1.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-cache": "^5.1.2",
    "node-schedule": "^2.1.1"
  }
}
```

Create `.env` file:
```env
PORT=3001
ADDON_URL=https://streamiocanonbot-9389aec130fa.herokuapp.com
TEMP_DIR=./temp
CHUNK_CLEANUP_MINUTES=30
MAX_CONCURRENT_DOWNLOADS=5
```

### Frontend Setup

```bash
cd frontend
npm install
```

**Required packages:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "video.js": "^8.6.1",
    "videojs-contrib-quality-levels": "^4.0.0",
    "videojs-hls-quality-selector": "^2.0.0",
    "axios": "^1.6.0",
    "react-router-dom": "^6.20.0"
  }
}
```

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:3001
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Frontend: http://localhost:3000
Backend: http://localhost:3001

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Serve with backend
cd ../backend
npm start
```

## 🔧 Key Features

### Backend Proxy
- **Manifest Proxy**: Serves hardcoded addon manifest
- **Stream Interceptor**: Intercepts Telegram stream URLs
- **Chunk Downloader**: Downloads video in chunks from Telegram
- **FFmpeg Processor**: Extracts multiple audio/subtitle tracks
- **HLS Generator**: Creates adaptive streaming playlists
- **Auto Cleanup**: Removes chunks after viewing/timeout

### Frontend Player
- **Video.js Integration**: Professional HTML5 player
- **Track Selector**: UI for switching audio/subtitle tracks
- **Quality Selection**: Adaptive bitrate streaming
- **Hardcoded Addon**: No user modifications possible

## 📝 How It Works

1. **User browses content**: Frontend fetches catalog from backend proxy
2. **Backend fetches from addon**: Proxies requests to Telegram addon
3. **User plays video**: Requests stream through proxy
4. **Proxy processes stream**:
   - Downloads video chunks from Telegram
   - Extracts audio/subtitle tracks using FFmpeg
   - Generates HLS manifest with multiple tracks
   - Serves adaptive stream to player
5. **Player switches tracks**: User can change audio/subtitle in real-time
6. **Cleanup**: Chunks auto-deleted after playback/timeout

## 🛠️ API Endpoints

### Backend API

```
GET  /manifest                          # Get addon manifest
GET  /catalog/:type/:id                 # Get catalog items
GET  /meta/:type/:id                    # Get item metadata
GET  /stream/:type/:id                  # Get streaming info
GET  /proxy/stream/:streamId            # Proxy HLS stream
GET  /proxy/tracks/:streamId/:track     # Get specific track
```

## 📄 Configuration

### Hardcoded Addon (frontend/src/config/addon.js)
```javascript
export const ADDON_CONFIG = {
  manifestUrl: 'https://streamiocanonbot-9389aec130fa.herokuapp.com/stremio/manifest.json',
  // This is hardcoded and cannot be changed by users
};
```

### Chunk Management (backend/src/config/chunks.js)
```javascript
module.exports = {
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  maxAge: 30 * 60 * 1000,      // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // Check every 5 minutes
};
```

## 🐳 Docker Deployment

```bash
# Using Docker Compose V2
docker compose up -d --build

# Or using the alias (if configured)
docker-compose up -d --build
```

## 📚 Next Steps

1. Implement authentication (if needed)
2. Add caching layer for frequently accessed content
3. Optimize FFmpeg settings for faster processing
4. Add progress indicators for chunk downloads
5. Implement resumable downloads
6. Add subtitle upload/customization
7. Optimize cleanup strategy based on usage patterns

## ⚠️ Important Notes

- FFmpeg must be installed and accessible in PATH
- Ensure sufficient disk space for temporary chunks
- Configure cleanup intervals based on usage
- Monitor bandwidth usage with Telegram API
- Consider rate limiting for production

## 📖 License

MIT License - Feel free to modify and use

---

**Built with ❤️ for better streaming experience**