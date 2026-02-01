/**
 * Social Media Crawler Middleware
 * Detects Telegram, Facebook, Twitter, and other social media bots
 * and serves custom HTML with Open Graph meta tags for rich previews
 */

const axios = require('axios');

// Bot user-agent patterns for SOCIAL MEDIA preview bots ONLY
// DO NOT include googlebot - it needs to see full React app for indexing!
const BOT_USER_AGENTS = [
    // Social networks
    'telegrambot',
    'twitterbot',
    'facebookexternalhit',
    'facebot',
    'linkedinbot',
    'slackbot',
    'slack-imgproxy',
    'discordbot',
    'whatsapp',
    'skypeuripreview',
    'pinterest',
    'pinterestbot',
    'vkshare',
    'w3c_validator',
    'redditbot',
    'rogerbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    // Preview testing tools
    'opengraph',
    'metatags',
    'previewbot',
    'iframely',
    'outbrain',
    'curl',
    'wget',
    'python-requests',
    'httpie'
    // NOTE: Do NOT add 'googlebot', 'bot', 'crawler', 'spider' here!
    // Google needs to see full React content for proper SEO indexing
];

// Check if request is from a social media bot
const isSocialBot = (userAgent) => {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    const isBot = BOT_USER_AGENTS.some(bot => ua.includes(bot));
    if (isBot) {
        console.log(`🤖 Matched social bot pattern in: ${ua.substring(0, 80)}`);
    }
    return isBot;
};

// Escape HTML entities to prevent breaking meta tag attributes
const escapeHtml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

// Generate HTML with OG tags for anime pages
const generateSocialHTML = (anime, url) => {
    const rawTitle = anime?.name || anime?.title || 'Anime Shrine';
    const rawDescription = anime?.description
        ? anime.description.substring(0, 200) + '...'
        : `Watch ${rawTitle} in HD with multi-audio support. Download anime in high quality with Hindi, English, and Japanese audio options.`;

    // Escape HTML entities to prevent quotes from breaking attributes
    const title = escapeHtml(rawTitle);
    const description = escapeHtml(rawDescription);
    const image = anime?.background || anime?.poster || 'https://animeshrine.xyz/og-default.jpg';
    const type = anime?.type === 'movie' ? 'video.movie' : 'video.tv_show';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Anime Shrine</title>
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title} - Anime Shrine">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Anime Shrine">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${url}">
    <meta name="twitter:title" content="${title} - Anime Shrine">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Additional Meta -->
    <meta name="description" content="${description}">
    ${anime?.genres ? `<meta property="video:tag" content="${escapeHtml(anime.genres.join(', '))}">` : ''}
    ${anime?.year ? `<meta property="video:release_date" content="${anime.year}">` : ''}
    ${anime?.imdbRating ? `<meta property="video:rating" content="${anime.imdbRating}">` : ''}
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
    <p>Visit <a href="${url}">${url}</a> to watch now!</p>
</body>
</html>`;
};

// Extract anime ID from URL path
// URL format: /series/anime-name-slug/209845-1 or /series/anime-slug-209845-1
// The meta API expects format: TMDB_ID-DB_INDEX (e.g., 209845-1)
const extractAnimeId = (path) => {
    // Pattern 1: ID is at end in format XXXXX-X: /series/.../209845-1
    const fullIdMatch = path.match(/(\d+-\d+)$/);
    if (fullIdMatch) {
        console.log(`📌 Extracted full ID: ${fullIdMatch[1]}`);
        return fullIdMatch[1];
    }

    // Pattern 2: Just numeric ID at end (add -1 as default DB index)
    const numericMatch = path.match(/(\d{5,7})$/);
    if (numericMatch) {
        const id = `${numericMatch[1]}-1`;
        console.log(`📌 Extracted numeric ID, adding default: ${id}`);
        return id;
    }

    console.log('⚠️ Could not extract ID from path:', path);
    return null;
};

// Detect content type from path
const getContentType = (path) => {
    if (path.startsWith('/movie/')) return 'movie';
    return 'series';
};

// Main middleware function
const socialMetaMiddleware = async (req, res, next) => {
    const userAgent = req.headers['user-agent'];

    // Only intercept for social media bots
    if (!isSocialBot(userAgent)) {
        return next();
    }

    console.log(`🤖 Social bot detected: ${userAgent.substring(0, 50)}...`);
    console.log(`📍 Requested path: ${req.path}`);

    // Process anime, series, and movie detail pages
    const isDetailPage = req.path.startsWith('/anime/') ||
        req.path.startsWith('/series/') ||
        req.path.startsWith('/movie/');

    if (!isDetailPage) {
        console.log('⏭️ Not a detail page, skipping');
        return next();
    }

    try {
        // Extract anime ID from the URL
        const animeId = extractAnimeId(req.path);
        const contentType = getContentType(req.path);

        if (!animeId) {
            console.log('⚠️ Could not extract anime ID from path:', req.path);
            return next();
        }

        console.log(`🔍 Fetching metadata for ${contentType} ID: ${animeId}`);

        // Fetch anime metadata from PUBLIC OG endpoint (not protected by referer check)
        const apiUrl = `${req.protocol}://${req.get('host')}/api/og/${contentType}/${animeId}`;
        console.log(`📡 API URL: ${apiUrl}`);

        const response = await axios.get(apiUrl, { timeout: 5000 });
        const anime = response.data?.meta;

        if (!anime) {
            console.log('⚠️ No anime metadata found, falling back to default');
            return next();
        }

        // Generate full URL
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        // Generate and send social-optimized HTML
        const html = generateSocialHTML(anime, fullUrl);
        res.set('Content-Type', 'text/html');
        res.send(html);

        console.log(`✅ Served social preview for: ${anime.name}`);
    } catch (error) {
        console.error('❌ Social meta middleware error:', error.message);
        // On error, fall through to regular page serving
        next();
    }
};

module.exports = socialMetaMiddleware;

