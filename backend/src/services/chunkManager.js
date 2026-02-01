const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

class ChunkManager {
  constructor(tempDir) {
    this.tempDir = tempDir;
    this.activeDownloads = new Map();
  }

  async downloadFile(url, streamId) {
    const outputDir = path.join(this.tempDir, streamId);
    const outputPath = path.join(outputDir, 'video.mp4');

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      // If file exists and is not empty, use it
      if (stats.size > 0) {
        console.log(`✅ File already exists (${(stats.size / 1024 / 1024).toFixed(2)} MB), skipping download`);
        return outputPath;
      } else {
        console.log(`⚠️  File exists but is empty, re-downloading...`);
        fs.unlinkSync(outputPath);
      }
    }

    // Create directory if not exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check if already downloading
    if (this.activeDownloads.has(streamId)) {
      console.log(`⏳ Download already in progress for ${streamId}, waiting...`);
      return this.activeDownloads.get(streamId);
    }

    const downloadPromise = this._downloadChunked(url, outputPath, streamId);
    this.activeDownloads.set(streamId, downloadPromise);

    try {
      await downloadPromise;
      return outputPath;
    } finally {
      this.activeDownloads.delete(streamId);
    }
  }

  async _downloadChunked(url, outputPath, streamId) {
    console.log(`Starting download for stream ${streamId}`);
    
    const writer = fs.createWriteStream(outputPath);
    
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
        
        if (downloadedSize % (5 * 1024 * 1024) === 0) { // Log every 5MB
          console.log(`Download progress for ${streamId}: ${progress}%`);
        }
      });

      await pipeline(response.data, writer);
      
      // IMPORTANT: Close the file handle and wait a bit
      writer.close();
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for file to close
      
      console.log(`Download completed for stream ${streamId}`);
      return outputPath;
    } catch (error) {
      // Cleanup on error
      writer.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async getDownloadProgress(streamId) {
    const outputDir = path.join(this.tempDir, streamId);
    const outputPath = path.join(outputDir, 'video.mp4');

    if (!fs.existsSync(outputPath)) {
      return { exists: false, size: 0 };
    }

    const stats = fs.statSync(outputPath);
    return {
      exists: true,
      size: stats.size,
      path: outputPath
    };
  }

  async cleanup(streamId) {
    const outputDir = path.join(this.tempDir, streamId);
    
    if (fs.existsSync(outputDir)) {
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
        console.log(`Cleaned up stream ${streamId}`);
      } catch (error) {
        console.error(`Failed to cleanup ${streamId}:`, error.message);
      }
    }
  }

  async cleanupAll() {
    const dirs = fs.readdirSync(this.tempDir);
    let cleaned = 0;

    for (const dir of dirs) {
      const dirPath = path.join(this.tempDir, dir);
      
      try {
        const stats = fs.statSync(dirPath);
        
        if (stats.isDirectory()) {
          const age = Date.now() - stats.mtimeMs;
          const maxAge = parseInt(process.env.CHUNK_CLEANUP_MINUTES || 30) * 60 * 1000;

          if (age > maxAge) {
            await this.cleanup(dir);
            cleaned++;
          }
        }
      } catch (error) {
        console.error(`Error checking ${dir}:`, error.message);
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old stream(s)`);
    }
  }
}

module.exports = ChunkManager;