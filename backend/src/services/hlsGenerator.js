const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class HLSGenerator {
  constructor(tempDir) {
    this.tempDir = tempDir;
  }

  /**
   * Generate HLS playlist from video file
   */
  async generateHLS(inputPath, streamId, options = {}) {
    const outputDir = path.join(this.tempDir, streamId);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const defaultOptions = {
      segmentDuration: 6,
      playlistType: 'vod',
      segmentFilename: 'segment_%03d.ts',
      playlistFilename: 'stream.m3u8',
      masterPlaylistFilename: 'master.m3u8',
      videoBitrate: '2000k',
      audioBitrate: '128k',
      includeAllTracks: true
    };

    const config = { ...defaultOptions, ...options };

    console.log(`Generating HLS for stream ${streamId}`);

    try {
      // Get video metadata first
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Generate HLS segments
      await this.generateSegments(inputPath, outputDir, config, metadata);

      // Generate master playlist
      const masterPlaylist = await this.generateMasterPlaylist(outputDir, config, metadata);

      console.log(`HLS generation completed for stream ${streamId}`);

      return {
        streamId,
        outputDir,
        masterPlaylistPath: path.join(outputDir, config.masterPlaylistFilename),
        streamPlaylistPath: path.join(outputDir, config.playlistFilename),
        metadata
      };
    } catch (error) {
      console.error(`HLS generation failed for stream ${streamId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
        const subtitleStreams = metadata.streams.filter(s => s.codec_type === 'subtitle');

        resolve({
          duration: metadata.format.duration,
          format: metadata.format.format_name,
          video: videoStream ? {
            index: videoStream.index,
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            bitrate: videoStream.bit_rate,
            fps: this.parseFPS(videoStream.r_frame_rate)
          } : null,
          audio: audioStreams.map(stream => ({
            index: stream.index,
            codec: stream.codec_name,
            language: stream.tags?.language || 'unknown',
            title: stream.tags?.title || `Audio ${stream.index}`,
            bitrate: stream.bit_rate,
            channels: stream.channels
          })),
          subtitles: subtitleStreams.map(stream => ({
            index: stream.index,
            codec: stream.codec_name,
            language: stream.tags?.language || 'unknown',
            title: stream.tags?.title || `Subtitle ${stream.index}`
          }))
        });
      });
    });
  }

  /**
   * Generate HLS segments
   */
  async generateSegments(inputPath, outputDir, config, metadata) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      // Video stream mapping
      if (metadata.video) {
        command.outputOptions([
          '-map', '0:v:0',
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-b:v', config.videoBitrate
        ]);
      }

      // Audio stream mapping
      if (config.includeAllTracks && metadata.audio.length > 0) {
        metadata.audio.forEach((audio, index) => {
          command.outputOptions([
            `-map 0:a:${index}`,
            `-c:a:${index} aac`,
            `-b:a:${index} ${config.audioBitrate}`,
            `-ac:a:${index} 2`
          ]);
        });
      } else if (metadata.audio.length > 0) {
        command.outputOptions([
          '-map', '0:a:0',
          '-c:a', 'aac',
          '-b:a', config.audioBitrate,
          '-ac', '2'
        ]);
      }

      // HLS specific options
      command.outputOptions([
        '-f', 'hls',
        '-hls_time', config.segmentDuration.toString(),
        '-hls_playlist_type', config.playlistType,
        '-hls_segment_type', 'mpegts',
        '-hls_segment_filename', path.join(outputDir, config.segmentFilename),
        '-hls_flags', 'independent_segments',
        '-start_number', '0'
      ]);

      // Output file
      command.output(path.join(outputDir, config.playlistFilename));

      // Progress tracking
      command.on('progress', (progress) => {
        if (progress.percent) {
          console.log(`HLS encoding progress: ${progress.percent.toFixed(2)}%`);
        }
      });

      // Error handling
      command.on('error', (err) => {
        console.error('FFmpeg error during HLS generation:', err.message);
        reject(err);
      });

      // Completion
      command.on('end', () => {
        console.log('HLS segments generated successfully');
        resolve();
      });

      // Start processing
      command.run();
    });
  }

  /**
   * Generate master playlist
   */
  async generateMasterPlaylist(outputDir, config, metadata) {
    const masterPath = path.join(outputDir, config.masterPlaylistFilename);

    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n\n';

    // Video variant
    if (metadata.video) {
      const bandwidth = this.estimateBandwidth(config.videoBitrate, config.audioBitrate);
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${metadata.video.width}x${metadata.video.height}`;
      
      if (metadata.audio.length > 0) {
        playlist += ',AUDIO="audio"';
      }
      
      playlist += '\n';
      playlist += `${config.playlistFilename}\n\n`;
    }

    // Audio tracks
    if (metadata.audio.length > 0) {
      metadata.audio.forEach((audio, index) => {
        playlist += `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="${audio.title}",`;
        playlist += `LANGUAGE="${audio.language}",`;
        playlist += `DEFAULT=${index === 0 ? 'YES' : 'NO'},`;
        playlist += `AUTOSELECT=YES,`;
        playlist += `URI="audio_${audio.index}.m3u8"\n`;
      });
    }

    // Subtitle tracks
    if (metadata.subtitles.length > 0) {
      metadata.subtitles.forEach((subtitle) => {
        playlist += `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${subtitle.title}",`;
        playlist += `LANGUAGE="${subtitle.language}",`;
        playlist += 'DEFAULT=NO,';
        playlist += 'AUTOSELECT=YES,';
        playlist += 'FORCED=NO,';
        playlist += `URI="subtitle_${subtitle.index}.m3u8"\n`;
      });
    }

    await fs.writeFile(masterPath, playlist, 'utf8');
    console.log('Master playlist generated:', masterPath);

    return masterPath;
  }

  /**
   * Parse FPS from frame rate string
   */
  parseFPS(frameRate) {
    if (!frameRate) return 0;
    const parts = frameRate.split('/');
    if (parts.length === 2) {
      return Math.round(parseInt(parts[0]) / parseInt(parts[1]));
    }
    return parseInt(frameRate);
  }

  /**
   * Estimate bandwidth from bitrates
   */
  estimateBandwidth(videoBitrate, audioBitrate) {
    const parseKbps = (bitrate) => {
      const match = bitrate.match(/(\d+)k/i);
      return match ? parseInt(match[1]) * 1000 : 0;
    };

    return parseKbps(videoBitrate) + parseKbps(audioBitrate);
  }

  /**
   * Generate adaptive bitrate variants
   */
  async generateAdaptiveHLS(inputPath, streamId) {
    const qualities = [
      { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
      { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
      { name: '480p', width: 854, height: 480, videoBitrate: '1000k', audioBitrate: '96k' }
    ];

    const outputDir = path.join(this.tempDir, streamId);
    await fs.mkdir(outputDir, { recursive: true });

    const metadata = await this.getVideoMetadata(inputPath);
    const variants = [];

    // Generate variants for each quality
    for (const quality of qualities) {
      // Skip if source resolution is lower
      if (metadata.video && metadata.video.height < quality.height) {
        continue;
      }

      const variantDir = path.join(outputDir, quality.name);
      await fs.mkdir(variantDir, { recursive: true });

      await this.generateSegments(inputPath, variantDir, {
        ...quality,
        playlistFilename: 'stream.m3u8',
        segmentFilename: 'segment_%03d.ts'
      }, metadata);

      variants.push({
        ...quality,
        playlistPath: path.join(variantDir, 'stream.m3u8')
      });
    }

    // Generate master playlist with all variants
    await this.generateAdaptiveMasterPlaylist(outputDir, variants, metadata);

    return {
      streamId,
      outputDir,
      variants,
      masterPlaylistPath: path.join(outputDir, 'master.m3u8')
    };
  }

  /**
   * Generate master playlist for adaptive streaming
   */
  async generateAdaptiveMasterPlaylist(outputDir, variants, metadata) {
    const masterPath = path.join(outputDir, 'master.m3u8');

    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n\n';

    variants.forEach(variant => {
      const bandwidth = this.estimateBandwidth(variant.videoBitrate, variant.audioBitrate);
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${variant.width}x${variant.height},NAME="${variant.name}"\n`;
      playlist += `${variant.name}/stream.m3u8\n\n`;
    });

    await fs.writeFile(masterPath, playlist, 'utf8');
    console.log('Adaptive master playlist generated with', variants.length, 'variants');

    return masterPath;
  }
}

module.exports = HLSGenerator;