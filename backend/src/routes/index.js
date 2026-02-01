const express = require('express');
const router = express.Router();
const axios = require('axios');
const CatalogItem = require('../models/CatalogItem');
const schedule = require('node-schedule');

const ADDON_URL = process.env.ADDON_URL;

// Helper: Extract first letter for alphabetical grouping
const getFirstLetter = (name) => {
  if (!name) return '#';
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
};

// Fetch all catalog items from addon and store in MongoDB
const fetchAndStoreCatalog = async () => {
  try {
    console.log('\n🔄 Starting catalog sync...');

    // Get manifest to find all catalogs
    const manifestRes = await axios.get(`${ADDON_URL}/stremio/manifest.json`);
    const catalogs = manifestRes.data.catalogs || [];

    const seriesCatalogs = catalogs.filter(c => c.type === 'series');
    const movieCatalogs = catalogs.filter(c => c.type === 'movie');

    console.log(`📦 Found ${seriesCatalogs.length} series catalogs, ${movieCatalogs.length} movie catalogs`);

    // Fetch all catalogs
    const allCatalogs = [...seriesCatalogs, ...movieCatalogs];
    let totalFetched = 0;
    let totalNew = 0;
    let totalUpdated = 0;

    // Track all IDs from addon to detect deletions
    const fetchedIds = new Set();

    for (const catalog of allCatalogs) {
      try {
        console.log(`\n📥 Fetching ${catalog.type}/${catalog.id}...`);

        let skip = 0;
        let hasMore = true;
        const PAGE_SIZE = 100; // Assume standard page size, or just keep fetching until empty

        while (hasMore) {
          // Construct URL with skip if > 0
          // Standard Stremio format: /catalog/{type}/{id}/skip={val}.json
          // If skip is 0, we can use the base URL or explicit skip=0
          const urlPath = skip > 0
            ? `${ADDON_URL}/stremio/catalog/${catalog.type}/${catalog.id}/skip=${skip}.json`
            : `${ADDON_URL}/stremio/catalog/${catalog.type}/${catalog.id}.json`;

          console.log(`   Requesting: ${urlPath}`);
          const catalogRes = await axios.get(urlPath);
          const items = catalogRes.data.metas || [];

          console.log(`   Found ${items.length} items (skip=${skip})`);

          if (items.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of items) {
            try {
              // Track this ID as present in addon
              fetchedIds.add(item.id);

              const existing = await CatalogItem.findOne({ id: item.id });

              const catalogData = {
                id: item.id,
                type: item.type || catalog.type,
                name: item.name,
                poster: item.poster,
                background: item.background,
                logo: item.logo,
                description: item.description,
                imdbRating: item.imdbRating,
                year: item.year,
                genres: item.genres || [],
                director: item.director || [],
                cast: item.cast || [],
                runtime: item.runtime,
                videos: item.videos || [],
                totalSub: item.total_sub || 0,
                totalDub: item.total_dub || 0,
                firstLetter: getFirstLetter(item.name),
                originalData: item,
                lastUpdated: new Date()
              };

              if (existing) {
                // Update existing
                await CatalogItem.updateOne({ id: item.id }, catalogData);
                totalUpdated++;
              } else {
                // Insert new
                await CatalogItem.create(catalogData);
                totalNew++;
              }
              totalFetched++;
            } catch (itemError) {
              console.error(`   ❌ Error processing item ${item.id}:`, itemError.message);
            }
          }

          // Prepare for next page
          skip += items.length;

          // Safety break if we fetched fewer than expected (implies end of list)
          // But some addons might return variable sizes, so empty check is safest.
          // We'll just rely on items.length === 0 to break.
          // Optional: Add a max limit to prevent infinite loops if addon is broken
          if (skip > 5000) {
            console.log('⚠️ Reached safety limit of 5000 items, stopping.');
            hasMore = false;
          }
        }
      } catch (catalogError) {
        console.error(`❌ Error fetching catalog ${catalog.type}/${catalog.id}:`, catalogError.message);
      }
    }

    // Delete items from DB that are no longer in addon
    console.log('\n🗑️ Checking for deleted items...');
    const dbItems = await CatalogItem.find({}).select('id').lean();
    const dbIds = dbItems.map(item => item.id);
    const idsToDelete = dbIds.filter(id => !fetchedIds.has(id));

    let totalDeleted = 0;
    if (idsToDelete.length > 0) {
      const deleteResult = await CatalogItem.deleteMany({ id: { $in: idsToDelete } });
      totalDeleted = deleteResult.deletedCount || 0;
      console.log(`🗑️ Deleted ${totalDeleted} items no longer in addon`);

      // Log first few deleted items for debugging
      if (idsToDelete.length <= 5) {
        console.log(`   Deleted IDs: ${idsToDelete.join(', ')}`);
      } else {
        console.log(`   Sample deleted IDs: ${idsToDelete.slice(0, 5).join(', ')}...`);
      }
    } else {
      console.log('✅ No orphaned items found');
    }

    console.log(`\n✅ Sync complete: ${totalFetched} processed, ${totalNew} new, ${totalUpdated} updated, ${totalDeleted} deleted`);
    return { totalFetched, totalNew, totalUpdated, totalDeleted };
  } catch (error) {
    console.error('❌ Catalog sync failed:', error.message);
    throw error;
  }
};

// GET /api/index - Get all indexed items grouped by letter
router.get('/', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    const { type } = req.query; // 'series' or 'movie'

    if (!type || !['series', 'movie'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "series" or "movie"' });
    }

    // Get all items of this type
    const items = await CatalogItem.find({ type }).sort({ name: 1 }).lean();

    // Group by first letter
    const grouped = {};
    items.forEach(item => {
      const letter = item.firstLetter || '#';
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push({
        id: item.id,
        name: item.name,
        poster: item.poster,
        year: item.year,
        imdbRating: item.imdbRating,
        genres: item.genres,
        totalSub: item.totalSub || item.total_sub || 0,
        totalDub: item.totalDub || item.total_dub || 0
      });
    });

    // Sort letters
    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    res.json({
      type,
      total: items.length,
      letters: sortedLetters,
      data: grouped
    });
  } catch (error) {
    console.error('❌ Index fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch index', details: error.message });
  }
});

// 🔍 GET /api/index/search - Search all items in MongoDB
router.get('/search', async (req, res) => {
  try {
    const referer = req.headers.referer || '';

    // Allow only AnimeShrine
    if (!referer.toLowerCase().includes('animeshrine')) {
      return res.status(403).json({
        error: 'Invalid request',
        message: 'Unauthorized'
      });
    }

    const { query, type, limit = 100 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const trimmedQuery = query.trim();

    // Escape regex special characters for safety
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create a flexible pattern that:
    // 1. Ignores punctuation (commas, colons, etc.)
    // 2. Allows flexible spacing
    // Example: "no game no life" matches "No Game, No Life"
    const flexiblePattern = trimmedQuery
      .split(/\s+/)  // Split by whitespace
      .map(word => escapeRegex(word))  // Escape each word
      .join('[\\s,.:;!?-]*');  // Allow punctuation/space between words

    // Build search filter with flexible case-insensitive regex
    const searchFilter = {
      name: { $regex: flexiblePattern, $options: 'i' }
    };

    // Add type filter if specified (but NOT for search results - we want both!)
    // Only filter if explicitly requested
    if (type && ['series', 'movie'].includes(type)) {
      searchFilter.type = type;
    }

    // Search MongoDB
    const results = await CatalogItem
      .find(searchFilter)
      .limit(parseInt(limit))
      .lean();

    // Sort results: prioritize "starts with" matches, then by rating
    results.sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
      const bStartsWith = b.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());

      // Prioritize items that start with the query
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Both start with or both don't - sort by rating
      return (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0);
    });

    console.log(`🔍 Search "${query}" (type: ${type || 'all'}): ${results.length} results`);

    res.json({
      query,
      type: type || 'all',
      total: results.length,
      results: results.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        poster: item.poster,
        background: item.background,
        year: item.year,
        imdbRating: item.imdbRating,
        genres: item.genres,
        videos: item.videos || [],
        totalSub: item.totalSub || item.total_sub || 0,
        totalDub: item.totalDub || item.total_dub || 0
      }))
    });
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Global sync state
let syncState = {
  isSyncing: false,
  totalFetched: 0,
  totalNew: 0,
  totalUpdated: 0,
  lastSyncTime: null,
  error: null
};

// POST /api/index/sync - Trigger background sync
router.post('/sync', async (req, res) => {
  if (syncState.isSyncing) {
    return res.status(409).json({ error: 'Sync already in progress' });
  }

  console.log('🔄 Manual sync triggered (background)');

  // Reset state
  syncState = {
    isSyncing: true,
    totalFetched: 0,
    totalNew: 0,
    totalUpdated: 0,
    lastSyncTime: null,
    error: null
  };

  // Start sync in background
  fetchAndStoreCatalog()
    .then(result => {
      syncState.isSyncing = false;
      syncState.lastSyncTime = new Date();
      syncState.totalFetched = result.totalFetched;
      syncState.totalNew = result.totalNew;
      syncState.totalUpdated = result.totalUpdated;
      console.log('✅ Background sync finished');
    })
    .catch(err => {
      syncState.isSyncing = false;
      syncState.error = err.message;
      console.error('❌ Background sync failed:', err.message);
    });

  res.json({
    success: true,
    message: 'Sync started in background'
  });
});

// GET /api/index/sync/status - Check sync progress
router.get('/sync/status', (req, res) => {
  res.json(syncState);
});

// Schedule automatic sync every hour
if (process.env.ENABLE_AUTO_SYNC !== 'false') {
  console.log('⏰ Scheduling automatic catalog sync every hour...');
  schedule.scheduleJob('0 * * * *', async () => {
    try {
      await fetchAndStoreCatalog();
    } catch (error) {
      console.error('❌ Scheduled sync failed:', error.message);
    }
  });

  // Run initial sync on startup (optional - can be disabled)
  if (process.env.RUN_INITIAL_SYNC !== 'false') {
    setTimeout(() => {
      console.log('🚀 Running initial catalog sync...');
      fetchAndStoreCatalog().catch(err => {
        console.error('❌ Initial sync failed:', err.message);
      });
    }, 5000); // Wait 5 seconds after server starts
  }
}

// 🔐 POST /api/index/admin/login - Simple hardcoded auth
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASS || 'admin123';

  if (username === validUser && password === validPass) {
    res.json({ success: true, token: 'admin-token-123' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// 🗑️ DELETE /api/index/:id - Delete item from MongoDB
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CatalogItem.deleteOne({ id });

    if (result.deletedCount > 0) {
      console.log(`🗑️ Deleted item ${id} from index`);
      res.json({ success: true, message: `Deleted ${id}` });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('❌ Delete error:', error.message);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

// 🗺️ GET /api/index/sitemap.xml - Generate dynamic sitemap from MongoDB
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Helper function to create slug
    const createSlug = (title) => {
      if (!title) return '';
      return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    // Get all items from MongoDB
    const allItems = await CatalogItem.find({}).sort({ lastUpdated: -1 }).lean();

    // Generate sitemap XML
    const baseUrl = 'https://animeshrine.xyz';
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/index</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    // Add anime URLs
    allItems.forEach(item => {
      const slug = createSlug(item.name);
      const urlType = item.type === 'movie' ? 'movie' : 'series';
      const lastMod = item.lastUpdated ? item.lastUpdated.toISOString().split('T')[0] : today;

      xml += `  <url>
    <loc>${baseUrl}/${urlType}/${slug}/${item.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    xml += `</urlset>`;

    // Set proper content type
    res.header('Content-Type', 'application/xml');
    res.send(xml);

    console.log(`🗺️ Sitemap generated with ${allItems.length} anime URLs`);
  } catch (error) {
    console.error('❌ Sitemap generation error:', error.message);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Sitemap generation failed</error>');
  }
});

module.exports = router;
