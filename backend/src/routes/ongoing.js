const express = require('express');
const router = express.Router();
const axios = require('axios');
const OngoingItem = require('../models/OngoingItem');
const schedule = require('node-schedule');

// Fetch and cache ongoing anime data
const fetchAndCacheOngoing = async () => {
  try {
    console.log('🔄 Starting ongoing anime fetch and cache...');

    // Delete ALL old data before fetching new
    await OngoingItem.deleteMany({});
    console.log('🗑️ Deleted all old ongoing data');

    const query = `
      query {
        Page(page: 1, perPage: 20) {
          media(status: RELEASING, sort: POPULARITY_DESC, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
            }
            bannerImage
            description
            averageScore
            episodes
            nextAiringEpisode {
              episode
              timeUntilAiring
            }
          }
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', {
      query
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.data?.data?.Page?.media) {
      console.error('❌ Invalid ongoing data from AniList');
      return;
    }

    const mediaList = response.data.data.Page.media;
    console.log(`📦 Fetched ${mediaList.length} ongoing anime from AniList`);

    // Store in DB with 24-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const ongoingItems = mediaList.map(media => ({
      anilistId: media.id,
      title: media.title,
      coverImage: media.coverImage,
      bannerImage: media.bannerImage,
      description: media.description,
      averageScore: media.averageScore,
      episodes: media.episodes,
      nextAiringEpisode: media.nextAiringEpisode,
      rawData: media,
      cachedAt: new Date(),
      expiresAt
    }));

    // Insert all items
    await OngoingItem.insertMany(ongoingItems);

    console.log(`✅ Cached ${ongoingItems.length} ongoing anime items`);

  } catch (error) {
    console.error('❌ Error fetching and caching ongoing anime:', error.message);
  }
};

// Schedule job: Run at 12:45 AM IST every day
// IST is UTC+5:30, so 12:45 AM IST = 7:15 PM UTC (previous day)
schedule.scheduleJob('15 19 * * *', async () => {
  console.log('⏰ Scheduled ongoing fetch triggered (12:45 AM IST)');
  await fetchAndCacheOngoing();
});

// Initial fetch on server start (if cache is empty)
OngoingItem.countDocuments({ expiresAt: { $gt: new Date() } })
  .then(count => {
    if (count === 0) {
      console.log('📥 No cached ongoing data found, fetching now...');
      setTimeout(() => {
        fetchAndCacheOngoing();
      }, 12000); // Wait 12 seconds after server starts (after schedule fetch)
    } else {
      console.log(`✅ Found ${count} cached ongoing items`);
    }
  })
  .catch(err => console.error('Error checking ongoing cache:', err));

// GET /api/ongoing - Return cached ongoing data
router.get('/', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    // Get cached ongoing items
    const ongoingItems = await OngoingItem.find({
      expiresAt: { $gt: new Date() }
    }).sort({ averageScore: -1 });

    if (ongoingItems.length === 0) {
      // No cache, fetch now
      return res.json({ media: [], cached: false, message: 'No cached data available' });
    }

    // Transform to AniList format for frontend compatibility
    const media = ongoingItems.map(item => ({
      id: item.anilistId,
      title: item.title,
      coverImage: item.coverImage,
      bannerImage: item.bannerImage,
      description: item.description,
      averageScore: item.averageScore,
      episodes: item.episodes,
      nextAiringEpisode: item.nextAiringEpisode
    }));

    res.json({
      media,
      cached: true,
      itemsCount: media.length
    });

  } catch (error) {
    console.error('❌ Error fetching cached ongoing:', error.message);
    res.status(500).json({
      error: 'Failed to fetch ongoing anime',
      message: error.message
    });
  }
});

// POST /api/ongoing/refresh - Manually refresh ongoing cache
router.post('/refresh', async (req, res) => {
  try {
    await fetchAndCacheOngoing();
    res.json({ success: true, message: 'Ongoing anime refreshed successfully' });
  } catch (error) {
    console.error('❌ Error refreshing ongoing:', error.message);
    res.status(500).json({
      error: 'Failed to refresh ongoing anime',
      message: error.message
    });
  }
});

module.exports = router;

