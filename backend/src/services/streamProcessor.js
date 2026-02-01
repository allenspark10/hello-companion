const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const HLSGenerator = require('./hlsGenerator');
const logger = require('../utils/logger');

class StreamProcessor {
  constructor(tempDir) {
    this.tempDir = tempDir;
    this.hlsGenerator = new HLSGenerator(tempDir);
  }

  // Get video info without conversion
  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('❌ FFprobe error:', err);
          reject(new Error(`FFprobe failed: ${err.message}`));
          return;
        }

        const audioTracks = metadata.streams.filter(s => s.codec_type === 'audio');
        const subtitleTracks = metadata.streams.filter(s => s.codec_type === 'subtitle');
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');

        const trackInfo = {
          video: videoStream ? {
            index: videoStream.index,
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height
          } : null,
          audio: audioTracks.map(track => ({
            index: track.index,
            codec: track.codec_name,
            language: track.tags?.language || 'unknown',
            title: track.tags?.title || `Audio ${track.index}`
          })),
          subtitles: subtitleTracks.map(track => ({
            index: track.index,
            codec: track.codec_name,
            language: track.tags?.language || 'unknown',
            title: track.tags?.title || `Subtitle ${track.index}`
          }))
        };

        resolve(trackInfo);
      });
    });
  }

  async extractTracks(videoPath, streamId) {
    const outputDir = path.join(this.tempDir, streamId);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      console.log(`🔍 Running ffprobe on: ${videoPath}`);
      
      ffmpeg.ffprobe(videoPath, async (err, metadata) => {
        if (err) {
          console.error('❌ FFprobe error:', err);
          reject(new Error(`FFprobe failed: ${err.message}`));
          return;
        }

        console.log('✅ FFprobe successful');
        console.log('Video format:', metadata.format.format_name);
        console.log('Video duration:', metadata.format.duration);
        console.log('Video size:', metadata.format.size);

        const audioTracks = metadata.streams.filter(s => s.codec_type === 'audio');
        const subtitleTracks = metadata.streams.filter(s => s.codec_type === 'subtitle');
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');

        console.log(`📊 Found ${audioTracks.length} audio, ${subtitleTracks.length} subtitle tracks`);

        const trackInfo = {
          video: videoStream ? {
            index: videoStream.index,
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height
          } : null,
          audio: audioTracks.map(track => ({
            index: track.index,
            codec: track.codec_name,
            language: track.tags?.language || 'unknown',
            title: track.tags?.title || `Audio ${track.index}`
          })),
          subtitles: subtitleTracks.map(track => ({
            index: track.index,
            codec: track.codec_name,
            language: track.tags?.language || 'unknown',
            title: track.tags?.title || `Subtitle ${track.index}`
          }))
        };

        // Generate HLS stream
        const hlsPath = path.join(outputDir, 'master.m3u8');
        
        try {
          console.log('🎬 Starting HLS conversion...');
          await this.generateHLS(videoPath, outputDir, trackInfo);
          
          console.log('✅ HLS generation complete');
          
          resolve({
            streamId,
            outputDir,
            hlsPath,
            tracks: trackInfo
          });
        } catch (error) {
          console.error('❌ HLS generation error:', error);
          reject(error);
        }
      });
    });
  }

  async generateHLS(inputPath, outputDir, trackInfo) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      console.log('📝 FFmpeg command options:');
      
      // Add stderr logging
      command.on('stderr', (stderrLine) => {
        console.log('FFmpeg:', stderrLine);
      });

      // Map video stream
      if (trackInfo.video) {
        console.log(`   Mapping video: codec=${trackInfo.video.codec}`);
        command.outputOptions([
          '-map', '0:v:0',
          '-c:v', 'copy'  // Just copy, don't re-encode
        ]);
      }

      // Map first audio stream only (simplified)
      if (trackInfo.audio.length > 0) {
        console.log(`   Mapping audio: codec=${trackInfo.audio[0].codec}`);
        command.outputOptions([
          '-map', '0:a:0',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ac', '2'
        ]);
      }

      // Skip subtitles for now (can cause issues)
      console.log('   Skipping subtitles for initial test');

      // HLS options - simplified
      const outputPath = path.join(outputDir, 'stream.m3u8');
      console.log(`   Output: ${outputPath}`);
      
      command.outputOptions([
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
        '-start_number', '0'
      ]);

      command.output(outputPath);

      // Progress tracking
      command.on('progress', (progress) => {
        if (progress.percent) {
          console.log(`⏳ HLS encoding: ${progress.percent.toFixed(1)}%`);
        }
      });

      // Error handling with detailed logs
      command.on('error', (err, stdout, stderr) => {
        console.error('❌ FFmpeg error:', err.message);
        console.error('FFmpeg stdout:', stdout);
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      });

      // Completion
      command.on('end', (stdout, stderr) => {
        console.log('✅ FFmpeg completed successfully');
        resolve();
      });

      // Start processing
      console.log('▶️  Starting FFmpeg...');
      command.run();
    });
  }

  async generateMasterPlaylist(streamId, tracks) {
    const outputDir = path.join(this.tempDir, streamId);
    const masterPath = path.join(outputDir, 'master.m3u8');

    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    // Add video stream
    if (tracks.video) {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=${tracks.video.width}x${tracks.video.height}\n`;
      playlist += 'stream.m3u8\n\n';
    }

    // Add audio tracks
    tracks.audio.forEach((audio, index) => {
      playlist += `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="${audio.title}",LANGUAGE="${audio.language}",DEFAULT=${index === 0 ? 'YES' : 'NO'},AUTOSELECT=YES,URI="audio_${audio.index}.m3u8"\n`;
    });

    // Add subtitle tracks
    tracks.subtitles.forEach((subtitle, index) => {
      playlist += `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${subtitle.title}",LANGUAGE="${subtitle.language}",DEFAULT=NO,AUTOSELECT=YES,URI="subtitle_${subtitle.index}.m3u8"\n`;
    });

    await fs.writeFile(masterPath, playlist);
    return masterPath;
  }
}

module.exports = StreamProcessor;