const fs = require('fs');
const path = require('path');

// TODO: Fetch real data from your API
// const fetch = require('node-fetch'); 
// const API_URL = "https://your-api.com/catalog";

const animes = [
    { imdbId: '21209876-1', title: 'Solo Leveling', lastMod: '2025-11-13' },
    { imdbId: '54321-1', title: 'One Piece', lastMod: '2025-11-20' },
    { imdbId: '98765-1', title: 'Jujutsu Kaisen', lastMod: '2025-11-15' }
];

function createSlug(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://animeshrine.xyz/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://animeshrine.xyz/index</loc>
    <priority>0.9</priority>
  </url>
${animes.map(anime => `  <url>
    <loc>https://animeshrine.xyz/series/${createSlug(anime.title)}/${anime.imdbId}</loc>
    <lastmod>${anime.lastMod}</lastmod>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
    console.error('Public directory not found at ' + publicDir);
    // Try current dir if script is run from root
    if (fs.existsSync('public')) {
        fs.writeFileSync('public/sitemap.xml', sitemap);
        console.log('✅ Sitemap generated in public/sitemap.xml!');
    } else {
        process.exit(1);
    }
} else {
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log('✅ Sitemap generated in public/sitemap.xml!');
}
