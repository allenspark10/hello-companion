const schedule = require('node-schedule');
const path = require('path');
const ChunkManager = require('../services/chunkManager');

const tempDir = path.join(__dirname, '../../temp');
const chunkManager = new ChunkManager(tempDir);

// Increase max listeners to avoid warning
process.setMaxListeners(15);

function startCleanupScheduler() {
  // Run cleanup every 5 minutes
  const job = schedule.scheduleJob('*/5 * * * *', async () => {
    console.log('Running scheduled cleanup...');
    try {
      await chunkManager.cleanupAll();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  });

  console.log('✅ Cleanup scheduler started (runs every 5 minutes)');
  
  // Initial cleanup on startup
  setTimeout(async () => {
    console.log('Running initial cleanup...');
    await chunkManager.cleanupAll();
  }, 5000);

  return job;
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.log('\nPerforming final cleanup before exit...');
  await chunkManager.cleanupAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nPerforming final cleanup before exit...');
  await chunkManager.cleanupAll();
  process.exit(0);
});

module.exports = { startCleanupScheduler };