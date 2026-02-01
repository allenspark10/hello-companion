const mongoose = require('mongoose');

const anilistTitleSchema = new mongoose.Schema({
  searchTitle: { type: String, required: true, unique: true, index: true, lowercase: true },
  anilistId: { type: Number, required: true, index: true },
  title: {
    romaji: String,
    english: String,
    native: String
  },
  coverImage: {
    large: String,
    extraLarge: String
  },
  cachedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true } // 7 days from cache time
}, {
  timestamps: true
});

// Create indexes
anilistTitleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

module.exports = mongoose.model('AniListTitle', anilistTitleSchema);

