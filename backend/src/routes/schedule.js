const express = require('express');
const router = express.Router();
const axios = require('axios');
const ScheduleItem = require('../models/ScheduleItem');
const AniListTitle = require('../models/AniListTitle');
const CatalogItem = require('../models/CatalogItem');
const schedule = require('node-schedule');

// Use the day from API directly (subsplease already organizes by correct day)
// No need to shift days - the schedule is already organized correctly
const getDayFromJSTTime = (jstTimeStr, dayFromAPI) => {
  // IST is JST - 3.5 hours
  // If JST is 00:00 to 03:29, it falls back to the previous day in IST.
  // 03:30 JST is 00:00 IST.

  if (!jstTimeStr || !dayFromAPI) return dayFromAPI;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let dayIndex = days.indexOf(dayFromAPI);

  if (dayIndex === -1) return dayFromAPI;

  try {
    const [hours, minutes] = jstTimeStr.split(':').map(Number);

    // Check if time is before 03:30
    if (hours < 3 || (hours === 3 && minutes < 30)) {
      // Shift to previous day
      dayIndex = (dayIndex - 1 + 7) % 7;
      return days[dayIndex];
    }
  } catch (e) {
    console.error('Error parsing time for day shift:', e);
  }

  return dayFromAPI;
};

// Fetch AniList data for a title (with caching)
const fetchAniListTitle = async (title) => {
  try {
    // Check cache first
    const cached = await AniListTitle.findOne({
      searchTitle: title.toLowerCase(),
      expiresAt: { $gt: new Date() }
    });

    if (cached) {
      return {
        id: cached.anilistId,
        title: cached.title,
        coverImage: cached.coverImage
      };
    }

    // Fetch from AniList API
    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
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
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { search: title }
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.data?.data?.Media) {
      const media = response.data.data.Media;

      // Cache for 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await AniListTitle.findOneAndUpdate(
        { searchTitle: title.toLowerCase() },
        {
          anilistId: media.id,
          title: media.title,
          coverImage: media.coverImage,
          cachedAt: new Date(),
          expiresAt
        },
        { upsert: true, new: true }
      );

      return {
        id: media.id,
        title: media.title,
        coverImage: media.coverImage
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch AniList data for ${title}:`, error.message);
    return null;
  }
};

// Fetch and cache schedule data
const fetchAndCacheSchedule = async () => {
  try {
    console.log('🔄 Starting schedule fetch and cache...');

    const response = await axios.get('https://subsplease.org/api/?f=schedule&tz=Asia/Tokyo', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.data?.schedule) {
      console.error('❌ Invalid schedule data');
      return;
    }

    const scheduleData = response.data.schedule;
    const allTitles = new Set();
    const scheduleItems = [];

    // Collect all schedule items
    Object.entries(scheduleData).forEach(([day, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.title && item.time) {
            allTitles.add(item.title);

            // Determine correct day considering timezone
            const correctDay = getDayFromJSTTime(item.time, day);

            scheduleItems.push({
              title: item.title,
              day: correctDay,
              time: item.time,
              show: item.show || item.title,
              rawData: item
            });
          }
        });
      }
    });

    console.log(`📦 Found ${scheduleItems.length} schedule items across ${allTitles.size} unique titles`);

    // Fetch AniList data with rate limiting
    const titleArray = Array.from(allTitles);
    let successCount = 0;

    for (let i = 0; i < titleArray.length; i++) {
      const title = titleArray[i];
      await fetchAniListTitle(title);
      successCount++;

      // Rate limiting: wait 300ms between requests
      if (i < titleArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   Processed ${i + 1}/${titleArray.length} titles...`);
      }
    }

    console.log(`✅ Fetched AniList data for ${successCount} titles`);

    // Delete ALL old schedule data before storing new
    await ScheduleItem.deleteMany({});
    console.log('🗑️ Deleted all old schedule data');

    // Store schedule items in DB with 24-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert new schedule items with AniList data
    for (const item of scheduleItems) {
      const anilistData = await AniListTitle.findOne({
        searchTitle: item.title.toLowerCase()
      });

      await ScheduleItem.create({
        ...item,
        anilistId: anilistData?.anilistId,
        anilistTitle: anilistData?.title,
        cachedAt: new Date(),
        expiresAt
      });
    }

    console.log(`✅ Cached ${scheduleItems.length} schedule items`);

  } catch (error) {
    console.error('❌ Error fetching and caching schedule:', error.message);
  }
};

// Schedule job: Run at 12:45 AM IST every day
// IST is UTC+5:30, so 12:45 AM IST = 7:15 PM UTC (previous day)
schedule.scheduleJob('15 19 * * *', async () => {
  console.log('⏰ Scheduled schedule fetch triggered (12:45 AM IST)');
  await fetchAndCacheSchedule();
});

// Initial fetch on server start (if cache is empty)
ScheduleItem.countDocuments({ expiresAt: { $gt: new Date() } })
  .then(count => {
    if (count === 0) {
      console.log('📥 No cached schedule found, fetching now...');
      setTimeout(() => {
        fetchAndCacheSchedule();
      }, 10000); // Wait 10 seconds after server starts
    } else {
      console.log(`✅ Found ${count} cached schedule items`);
    }
  })
  .catch(err => console.error('Error checking cache:', err));

// GET /api/schedule - Return cached schedule data
router.get('/', async (req, res) => {
  try {
    const referer = req.headers.referer || '';
    if (!referer.toLowerCase().includes('animeshrine')) return res.status(403).json({ error: 'Invalid request', message: 'Unauthorized' });

    // Get cached schedule items
    const scheduleItems = await ScheduleItem.find({
      expiresAt: { $gt: new Date() }
    }).sort({ day: 1, time: 1 });

    if (scheduleItems.length === 0) {
      // No cache, fetch now
      return res.json({ schedule: {}, cached: false, message: 'No cached data available' });
    }

    // Group by day
    const scheduleByDay = {};
    scheduleItems.forEach(item => {
      if (!scheduleByDay[item.day]) {
        scheduleByDay[item.day] = [];
      }

      scheduleByDay[item.day].push({
        title: item.title,
        time: item.time,
        show: item.show,
        anilistId: item.anilistId,
        anilistTitle: item.anilistTitle,
        coverImage: item.anilistTitle ? {
          large: null,
          extraLarge: null
        } : null
      });
    });

    res.json({
      schedule: scheduleByDay,
      cached: true,
      itemsCount: scheduleItems.length
    });

  } catch (error) {
    console.error('❌ Error fetching cached schedule:', error.message);
    res.status(500).json({
      error: 'Failed to fetch schedule',
      message: error.message
    });
  }
});

// POST /api/schedule/refresh - Manually refresh schedule cache
router.post('/refresh', async (req, res) => {
  try {
    await fetchAndCacheSchedule();
    res.json({ success: true, message: 'Schedule refreshed successfully' });
  } catch (error) {
    console.error('❌ Error refreshing schedule:', error.message);
    res.status(500).json({
      error: 'Failed to refresh schedule',
      message: error.message
    });
  }
});

module.exports = router;
