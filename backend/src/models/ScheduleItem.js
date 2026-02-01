const mongoose = require('mongoose');

const scheduleItemSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  day: { type: String, required: true, enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], index: true },
  time: { type: String, required: true }, // JST time format "HH:MM"
  show: String,
  rawData: mongoose.Schema.Types.Mixed, // Store original subsplease data
  anilistId: Number, // AniList ID if found
  anilistTitle: {
    english: String,
    romaji: String,
    native: String
  },
  cachedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true } // 24 hours from cache time
}, {
  timestamps: true
});

// Create indexes
scheduleItemSchema.index({ day: 1, time: 1 });
scheduleItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

module.exports = mongoose.model('ScheduleItem', scheduleItemSchema);

