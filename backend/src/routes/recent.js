const express = require('express');
const router = express.Router();
const axios = require('axios');

// Paginated Series: uses addon's /api/media/list endpoint for Load More
router.get('/series/paginated', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    const addonUrl = process.env.ADDON_URL;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 24;
    const search = req.query.search || '';

    // Use the addon's paginated media list endpoint
    const url = `${addonUrl}/api/media/list?media_type=tv&page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search)}`;

    console.log(`📥 Fetching paginated series: page=${page}, size=${pageSize}`);
    console.log(`🔗 URL: ${url}`);

    const response = await axios.get(url, { timeout: 15000 });

    // The addon returns { items: [...], total: ..., page: ..., page_size: ... }
    const data = response.data;

    // Transform to match our frontend's expected format
    const metas = (data.items || []).map(item => ({
      id: item.tmdb_id ? `tmdb:${item.tmdb_id}` : item.id,
      type: 'series',
      name: item.title || item.name,
      poster: item.poster || item.posterUrl,
      background: item.backdrop || item.backgroundUrl,
      year: item.year,
      genres: item.genres || [],
      description: item.description || item.overview,
      imdbRating: item.rating || item.imdbRating
    }));

    console.log(`✅ Returned ${metas.length} items (page ${page}, total: ${data.total || 'unknown'})`);

    res.json({
      metas,
      total: data.total || metas.length,
      page,
      pageSize,
      hasMore: metas.length === pageSize // If we got full page, there might be more
    });
  } catch (err) {
    console.error('❌ Paginated series fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch paginated series', details: err.message });
  }
});

// Optimized Load More: uses public Stremio catalog endpoint for unlimited pagination
router.get('/series/load-more', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    const addonUrl = process.env.ADDON_URL;
    if (!addonUrl) {
      return res.status(500).json({ error: 'ADDON_URL not configured' });
    }

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 48; // Default to 48 for Load More
    const search = req.query.search || '';

    // Calculate skip parameter for Stremio catalog pagination
    const skip = (page - 1) * 15; // Stremio uses 15 items per page

    // Use public Stremio catalog endpoint (no authentication required)
    const catalogId = 'latest_series';
    let url = `${addonUrl}/stremio/catalog/series/${catalogId}`;

    // Add skip parameter if not first page
    if (skip > 0) {
      url += `/skip=${skip}.json`;
    } else {
      url += '.json';
    }

    console.log(`🚀 Load More: page=${page}, skip=${skip}`);
    console.log(`🔗 URL: ${url}`);

    const response = await axios.get(url, { timeout: 15000 });
    const data = response.data;

    console.log(`📦 Response keys:`, Object.keys(data));

    // Stremio catalog returns: { metas: [...] }
    const items = data.metas || [];

    console.log(`📊 Found ${items.length} items in catalog response`);

    // Transform Stremio meta format to our frontend format
    const metas = items.map(item => {
      // Stremio ID format: "{tmdb_id}-{db_index}"
      const stremioId = item.id || '';
      const tmdbId = stremioId.split('-')[0]; // Extract tmdb_id from "12345-1" format

      return {
        id: `tmdb:${tmdbId}`,
        type: 'series',
        name: item.name,
        poster: item.poster,
        background: item.background || item.backdrop,
        year: item.year || item.releaseInfo,
        imdbRating: item.imdbRating,
        totalSub: item.total_sub || 0,
        totalDub: item.total_dub || 0
      };
    });

    console.log(`✅ Load More returned ${metas.length} items (page ${page})`);

    // Since catalog doesn't provide total count, estimate based on whether we got full page
    const hasMore = items.length === 15; // Stremio catalog returns 15 items per page

    res.json({
      metas,
      total: page * items.length + (hasMore ? 15 : 0), // Estimated total
      currentPage: page,
      totalPages: hasMore ? page + 1 : page,
      hasMore
    });
  } catch (err) {
    console.error('❌ Load More error:', err.message);
    if (err.response) {
      console.error('❌ Response status:', err.response.status);
      console.error('❌ Response data:', JSON.stringify(err.response.data).substring(0, 200));
    }
    res.status(500).json({ error: 'Failed to load more series', details: err.message });
  }
});

// Recent Series: proxy external JSON (for initial/fallback load - returns all at once)
router.get('/series', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    const url = process.env.RECENT_SERIES_URL || 'https://dl.animeshrine.xyz/stremio/catalog/series/latest_series.json';
    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent series', details: err.message });
  }
});

// Recent Movies: optional external JSON (set RECENT_MOVIES_URL)
router.get('/movie', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    const url = process.env.RECENT_MOVIES_URL;
    if (!url) return res.json({ metas: [] });
    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent movies', details: err.message });
  }
});

module.exports = router;

