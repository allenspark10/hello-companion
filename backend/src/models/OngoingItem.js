const mongoose = require('mongoose');

const ongoingItemSchema = new mongoose.Schema({
  anilistId: { type: Number, required: true, unique: true, index: true },
  title: {
    romaji: String,
    english: String,
    native: String
  },
  coverImage: {
    large: String,
    extraLarge: String
  },
  bannerImage: String,
  description: String,
  averageScore: Number,
  episodes: Number,
  nextAiringEpisode: {
    episode: Number,
    timeUntilAiring: Number
  },
  rawData: mongoose.Schema.Types.Mixed, // Store original AniList data
  cachedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true } // 24 hours from cache time
}, {
  timestamps: true
});

// Create indexes
ongoingItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

module.exports = mongoose.model('OngoingItem', ongoingItemSchema);

