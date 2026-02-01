const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache catalog responses for 5 minutes
const catalogCache = new NodeCache({ stdTTL: 300 });

router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    const referer = req.headers.referer || '';

    // Allow only AnimeShrine
    if (!referer.toLowerCase().includes('animeshrine')) {
      return res.status(403).json({
        error: 'Invalid request',
        message: 'Unauthorized'
      });
    }

    const addonUrl = process.env.ADDON_URL;

    // ✅ Validate type
    if (!['movie', 'series'].includes(type)) {
      console.log(`❌ Invalid catalog type: ${type}`);
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type must be "movie" or "series"'
      });
    }

    // Check cache first
    const cacheKey = `${type}-${id}`;
    const cached = catalogCache.get(cacheKey);

    if (cached) {
      const cachedCount = cached.metas?.length || 0;
      console.log(`⚡ Cache hit: ${type}/${id} (${cachedCount} items)`);

      // ⚠️ Don't return cached empty responses for movies - always fetch fresh
      if (type === 'movie' && cachedCount === 0) {
        console.log(`🔄 Bypassing cache for empty movie catalog: ${type}/${id}`);
      } else {
        return res.json(cached);
      }
    }

    const catalogUrl = `${addonUrl}/stremio/catalog/${type}/${id}.json`;

    console.log(`\n📥 Fetching catalog: ${type}/${id}`);
    console.log(`🔗 Full URL: ${catalogUrl}`);

    const response = await axios.get(catalogUrl, {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': 'AnimeHub/1.0'
      },
      validateStatus: (status) => status < 500 // Don't throw on 4xx
    });

    // ✅ Handle 4xx errors from Heroku
    if (response.status >= 400) {
      console.log(`⚠️ Heroku returned ${response.status} for ${type}/${id}`);
      console.log(`Response:`, response.data);
      return res.status(response.status).json({
        error: 'Catalog not found',
        message: `Heroku addon returned ${response.status}`,
        catalog: `${type}/${id}`
      });
    }

    const itemCount = response.data.metas?.length || 0;
    console.log(`✅ Catalog ${type}/${id}: ${itemCount} items loaded`);

    // Debug: Log detailed info for empty responses
    if (itemCount === 0) {
      console.log(`⚠️ Empty catalog response: ${type}/${id}`);
      console.log(`   Response status: ${response.status}`);
      console.log(`   Response structure:`, {
        hasMetas: !!response.data.metas,
        metasType: Array.isArray(response.data.metas) ? 'array' : typeof response.data.metas,
        metasLength: response.data.metas?.length || 0,
        responseKeys: Object.keys(response.data || {})
      });
      if (type === 'movie') {
        console.log(`   ⚠️ NOTE: Movie catalog is empty - check Python backend db.sort_movies()`);
      }
    }

    // ✅ Cache successful responses only
    // Never cache empty movie catalogs (in case Python backend returns movies later)
    if (itemCount > 0) {
      catalogCache.set(cacheKey, response.data);
      console.log(`💾 Cached ${type}/${id}`);
    } else if (type === 'movie') {
      console.log(`⚠️ Not caching empty movie catalog (will retry on next request)`);
      // Don't cache empty movie responses
    } else {
      // Cache empty series responses to avoid repeated calls
      catalogCache.set(cacheKey, response.data);
      console.log(`⚠️ Cached empty ${type}/${id} catalog`);
    }

    res.json(response.data);

  } catch (error) {
    console.error(`\n❌ Catalog error (${req.params.type}/${req.params.id}):`);
    console.error(`   Error: ${error.message}`);

    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }

    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }

    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch catalog',
      details: error.message,
      type: req.params.type,
      id: req.params.id,
      url: `${process.env.ADDON_URL}/stremio/catalog/${req.params.type}/${req.params.id}.json`
    });
  }
});

// ✅ Clear cache endpoint (useful for debugging)
router.delete('/cache/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const cacheKey = `${type}-${id}`;
  const deleted = catalogCache.del(cacheKey);

  res.json({
    success: deleted > 0,
    message: deleted > 0 ? 'Cache cleared' : 'Not found in cache',
    key: cacheKey
  });
});

// ✅ Clear all cache
router.delete('/cache', (req, res) => {
  const keys = catalogCache.keys();
  catalogCache.flushAll();

  res.json({
    success: true,
    message: `Cleared ${keys.length} cached catalogs`
  });
});

// ✅ Cache stats
router.get('/cache/stats', (req, res) => {
  const stats = catalogCache.getStats();
  res.json({
    keys: catalogCache.keys(),
    stats: stats
  });
});

module.exports = router;