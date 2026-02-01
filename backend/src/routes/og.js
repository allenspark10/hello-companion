const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache OG responses for 10 minutes (same as meta)
const ogCache = new NodeCache({ stdTTL: 600 });

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

// Rate limiter middleware
const rateLimit = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }

    const record = rateLimitMap.get(ip);

    // Reset if window expired
    if (now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }

    // Check rate limit
    if (record.count >= RATE_LIMIT) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later'
        });
    }

    record.count++;
    next();
};

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

// Valid ID pattern: TMDB_ID-DB_INDEX (e.g., "12345-1")
const VALID_ID_PATTERN = /^\d+-\d+$/;

/**
 * PUBLIC OpenGraph endpoint for social media previews
 * Returns ONLY essential preview data - no streaming URLs or sensitive data
 * 
 * This endpoint is public (no referer check) but rate-limited
 */
router.get('/:type/:id', rateLimit, async (req, res) => {
    try {
        const { type, id } = req.params;
        const addonUrl = process.env.ADDON_URL;

        // Validate type
        if (!['movie', 'series'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid type',
                message: 'Type must be "movie" or "series"'
            });
        }

        // Validate ID format
        if (!VALID_ID_PATTERN.test(id)) {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: 'ID must be in format: TMDB_ID-DB_INDEX (e.g., 12345-1)'
            });
        }

        // Check cache first
        const cacheKey = `og-${type}-${id}`;
        const cached = ogCache.get(cacheKey);

        if (cached) {
            console.log(`⚡ OG Cache hit: ${type}/${id}`);
            return res.json(cached);
        }

        console.log(`🌐 Fetching OG meta: ${type}/${id}`);

        // Fetch from addon with retry logic
        const MAX_RETRIES = 2;
        const TIMEOUT = 10000; // 10 seconds
        let lastError;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await axios.get(`${addonUrl}/stremio/meta/${type}/${id}.json`, {
                    timeout: TIMEOUT,
                    validateStatus: (status) => status < 500
                });

                if (response.status >= 400) {
                    return res.status(response.status).json({
                        error: 'Content not found',
                        message: `No preview data available for ${type}/${id}`
                    });
                }

                const meta = response.data?.meta;

                if (!meta) {
                    return res.status(404).json({
                        error: 'No metadata',
                        message: 'Preview data not available'
                    });
                }

                // Return ONLY OpenGraph-relevant fields (no streaming URLs, no episode lists)
                const ogData = {
                    meta: {
                        id: meta.id,
                        name: meta.name || meta.title,
                        title: meta.title || meta.name,
                        description: meta.description ? meta.description.substring(0, 300) : null,
                        poster: meta.poster,
                        background: meta.background,
                        logo: meta.logo,
                        year: meta.year,
                        genres: meta.genres,
                        imdbRating: meta.imdbRating,
                        type: meta.type
                        // Explicitly NOT including: videos, streams, episode lists, etc.
                    }
                };

                // Cache the response
                ogCache.set(cacheKey, ogData);

                console.log(`✅ OG meta served: ${meta.name || id}`);
                return res.json(ogData);

            } catch (attemptError) {
                lastError = attemptError;
                console.log(`❌ OG fetch attempt ${attempt}/${MAX_RETRIES} failed: ${attemptError.message}`);

                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
            }
        }

        throw lastError;

    } catch (error) {
        console.error(`❌ OG endpoint error (${req.params.type}/${req.params.id}):`, error.message);
        res.status(500).json({
            error: 'Failed to fetch preview data',
            message: 'Please try again later'
        });
    }
});

// Cache stats endpoint
router.get('/cache/stats', (req, res) => {
    res.json({
        keys: ogCache.keys().length,
        stats: ogCache.getStats()
    });
});

module.exports = router;
