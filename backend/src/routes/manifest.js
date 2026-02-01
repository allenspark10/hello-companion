const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    const referer = req.headers.referer || '';

    // Allow only AnimeShrine
    if (!referer.toLowerCase().includes('animeshrine')) {
      return res.status(403).json({
        error: 'Invalid request',
        message: 'Unauthorized'
      });
    }

    const addonUrl = process.env.ADDON_URL;
    const manifestUrl = `${addonUrl}/stremio/manifest.json`;

    console.log(`🔍 Fetching manifest from: ${manifestUrl}`);

    const response = await axios.get(manifestUrl);

    console.log('✅ Manifest fetched successfully');
    console.log('📋 Available catalogs:', response.data.catalogs?.map(c => `${c.type}/${c.id}`));

    // Filter and log series catalogs
    const seriesCatalogs = response.data.catalogs?.filter(c => c.type === 'series');
    console.log('🎬 Series catalogs:', seriesCatalogs?.map(c => c.id));

    res.json(response.data);
  } catch (error) {
    console.error('❌ Manifest fetch error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch manifest',
      details: error.message
    });
  }
});

module.exports = router;