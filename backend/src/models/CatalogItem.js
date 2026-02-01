const mongoose = require('mongoose');

const catalogItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true, enum: ['series', 'movie'], index: true },
  name: { type: String, required: true, index: true },
  poster: String,
  background: String,
  logo: String,
  description: String,
  imdbRating: String,
  year: Number,
  genres: [String],
  director: [String],
  cast: [String],
  runtime: String,
  videos: [{
    id: String,
    title: String,
    season: Number,
    episode: Number
  }],
  // For alphabetical sorting
  firstLetter: { type: String, index: true },
  // Track when last updated
  lastUpdated: { type: Date, default: Date.now, index: true },
  // Store original JSON data for reference
  originalData: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Create indexes for efficient queries
catalogItemSchema.index({ type: 1, firstLetter: 1 });
catalogItemSchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('CatalogItem', catalogItemSchema);
