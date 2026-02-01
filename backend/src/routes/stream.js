const express = require('express');
const router = express.Router();
const axios = require('axios');

// Simple cache for stream info (no file processing needed)
const streamCache = new Map();

// MAIN ROUTE: Get streams from addon and return direct URLs
router.get('/:type/:id', async (req, res) => {
  try {
    const referer = req.headers.referer || '';

    // Allow only AnimeShrine
    if (!referer.toLowerCase().includes('animeshrine')) {
      return res.status(403).json({
        error: 'Invalid request',
        message: 'Unauthorized'
      });
    }
    
    const { type, id } = req.params;
    const addonUrl = process.env.ADDON_URL;

    // Use /stremio/ prefix with .json extension
    const streamUrl = `${addonUrl}/stremio/stream/${type}/${id}.json`;

    console.log(`\n🔍 Fetching streams for ${type}/${id}`);
    console.log(`📡 URL: ${streamUrl}`);

    // Fetch from Telegram addon
    const response = await axios.get(streamUrl);
    const streams = response.data.streams;

    console.log(`📦 Received ${streams?.length || 0} streams from addon`);

    if (!streams || streams.length === 0) {
      return res.status(404).json({ error: 'No streams found' });
    }

    // Helper: extract id between /dl/ and next slash
    const extractDlId = (urlString) => {
      try {
        const u = new URL(urlString);
        const match = u.pathname.match(/\/dl\/([^/]+)/);
        return match && match[1] ? match[1] : '';
      } catch (_) {
        const m = (urlString || '').match(/\/dl\/([^/]+)/);
        return m && m[1] ? m[1] : '';
      }
    };

    // Transform streams - return DIRECT Heroku URLs (no processing)
    const transformedStreams = streams.map((stream, index) => {
      console.log(`\n📝 Stream ${index + 1}:`);
      console.log(`   Name: ${stream.name || stream.title}`);
      console.log(`   Direct URL: ${stream.url}`);

      // Create deterministic streamId for caching
      const streamId = Buffer.from(`${type}-${id}-${index}`)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 32);

      // Store original stream info in cache (for reference only)
      streamCache.set(streamId, {
        originalUrl: stream.url,
        title: stream.title || stream.name || 'Unknown',
        name: stream.name,
        behaviorHints: stream.behaviorHints || {},
        timestamp: Date.now()
      });

      // Log for debugging Season 0/Episode 0
      if (id.includes(':0:') || id.endsWith(':0')) {
        console.log(`⚠️ Special Season/Episode detected in ID: ${id}`);
        console.log(`   Stream Name: ${stream.name}`);
        console.log(`   Stream Title: ${stream.title}`);
      }

      // Return DIRECT URL from Heroku (no proxy, no processing)
      return {
        name: stream.name,
        title: stream.title,
        url: stream.url, // ✅ DIRECT HEROKU URL - NO BACKEND PROCESSING
        streamId: streamId,
        behaviorHints: stream.behaviorHints,
        // Expose code explicitly if provided by addon; otherwise derive from /dl/<id>/ path
        code: typeof stream.code === 'string' && stream.code.trim().length > 0
          ? stream.code.trim()
          : extractDlId(stream.url)
      };
    });

    console.log(`\n✅ Returning ${transformedStreams.length} direct stream URLs`);
    console.log(`🎯 All URLs point directly to Heroku - NO backend processing`);

    res.json({ streams: transformedStreams });

  } catch (error) {
    console.error('❌ Stream fetch error:', error.message);
    console.error(`   URL attempted: ${error.config?.url || 'unknown'}`);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({
      error: 'Failed to fetch streams',
      details: error.message
    });
  }
});

// Get cached stream info (lightweight - no file operations)
router.get('/info/:streamId', async (req, res) => {
  const { streamId } = req.params;
  const streamInfo = streamCache.get(streamId);

  if (!streamInfo) {
    return res.status(404).json({ error: 'Stream not found in cache' });
  }

  res.json({
    streamId: streamId,
    title: streamInfo.title,
    name: streamInfo.name,
    url: streamInfo.originalUrl,
    timestamp: streamInfo.timestamp
  });
});

// Clear cache for specific stream
router.delete('/cleanup/:streamId', async (req, res) => {
  const { streamId } = req.params;
  streamCache.delete(streamId);
  res.json({
    success: true,
    message: 'Stream cache cleared',
    streamId: streamId
  });
});

// Clear all cache
router.delete('/cleanup-all', async (req, res) => {
  const size = streamCache.size;
  streamCache.clear();
  res.json({
    success: true,
    message: `Cleared ${size} cached streams`
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    cacheSize: streamCache.size,
    message: 'Stream service running - Direct URLs only (no processing)'
  });
});

module.exports = router;
