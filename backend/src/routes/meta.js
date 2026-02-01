const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache meta responses for 10 minutes
const metaCache = new NodeCache({ stdTTL: 600 });

// ✅ FIXED: Valid meta ID pattern for YOUR Heroku addon
// Format: TMDB_ID-DB_INDEX (e.g., "12345-1", "94605-2")
const VALID_META_PATTERN = /^\d+-\d+$/;

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

    // Validate type
    if (!['movie', 'series'].includes(type)) {
      console.log(`❌ Invalid type: ${type}`);
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type must be "movie" or "series"'
      });
    }

    // ✅ FIXED: Validate ID format for TMDB-based IDs
    if (!VALID_META_PATTERN.test(id)) {
      console.log(`❌ Invalid ${type} ID format: ${id}`);
      console.log(`   Expected format: TMDB_ID-DB_INDEX (e.g., 12345-1)`);
      return res.status(400).json({
        error: 'Invalid ID format',
        message: `${type} ID must be in format: TMDB_ID-DB_INDEX (e.g., 12345-1)`,
        received: id
      });
    }

    // Check cache first
    const cacheKey = `${type}-${id}`;
    const cached = metaCache.get(cacheKey);

    if (cached) {
      console.log(`⚡ Cache hit: ${type}/${id}`);
      return res.json(cached);
    }

    console.log(`📝 Fetching meta: ${type}/${id}`);

    // Retry logic with exponential backoff
    const MAX_RETRIES = 3;
    const INITIAL_TIMEOUT = 15000; // 15 seconds for first attempt
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeout = INITIAL_TIMEOUT * attempt; // 15s, 30s, 45s
        console.log(`🔄 Attempt ${attempt}/${MAX_RETRIES} (timeout: ${timeout}ms)`);

        const response = await axios.get(`${addonUrl}/stremio/meta/${type}/${id}.json`, {
          timeout: timeout,
          validateStatus: (status) => status < 500 // Don't throw on 4xx
        });

        // Handle 404 or other client errors
        if (response.status >= 400) {
          console.log(`⚠️  Addon returned ${response.status} for ${type}/${id}`);
          return res.status(response.status).json({
            error: 'Content not found',
            message: `No meta data available for ${type}/${id}`
          });
        }

        console.log(`✅ Meta fetched successfully: ${response.data.meta?.name || id} (attempt ${attempt})`);

        // Cache the response
        metaCache.set(cacheKey, response.data);

        return res.json(response.data);
      } catch (attemptError) {
        lastError = attemptError;
        console.log(`❌ Attempt ${attempt}/${MAX_RETRIES} failed: ${attemptError.message}`);

        // Don't retry on last attempt
        if (attempt < MAX_RETRIES) {
          // Wait before retrying (exponential backoff: 1s, 2s)
          const waitTime = 1000 * attempt;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    throw lastError;
  } catch (error) {
    console.error(`❌ Meta error (${req.params.type}/${req.params.id}):`, error.message);

    // More detailed error response
    const errorResponse = {
      error: 'Failed to fetch meta',
      details: error.message,
      type: req.params.type,
      id: req.params.id
    };

    if (error.response) {
      errorResponse.status = error.response.status;
      errorResponse.statusText = error.response.statusText;
    }

    res.status(error.response?.status || 500).json(errorResponse);
  }
});

// Clear cache endpoint
router.delete('/cache/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const cacheKey = `${type}-${id}`;
  const deleted = metaCache.del(cacheKey);

  res.json({
    success: deleted > 0,
    message: deleted > 0 ? 'Cache cleared' : 'Not found in cache',
    key: cacheKey
  });
});

// Clear all cache
router.delete('/cache', (req, res) => {
  const keys = metaCache.keys();
  metaCache.flushAll();

  res.json({
    success: true,
    message: `Cleared ${keys.length} cached items`
  });
});

// Cache stats
router.get('/cache/stats', (req, res) => {
  const stats = metaCache.getStats();
  res.json({
    keys: metaCache.keys(),
    stats: stats
  });
});

module.exports = router;
