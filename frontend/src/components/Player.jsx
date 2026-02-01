import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack, Settings } from 'lucide-react';

const EnhancedPlayer = ({ streamUrl, tracks, onClose, title }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressBarRef = useRef(null);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const hideControlsTimeout = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = streamUrl;
    
    const handleLoadedData = () => {
      setDuration(video.duration);
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'ArrowLeft') {
        skip(-10);
      } else if (e.code === 'ArrowRight') {
        skip(10);
      } else if (e.code === 'ArrowUp') {
        changeVolume(0.1);
      } else if (e.code === 'ArrowDown') {
        changeVolume(-0.1);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      clearTimeout(hideControlsTimeout.current);
    };
  }, [streamUrl, onClose]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    setShowSettings(false);
    clearTimeout(hideControlsTimeout.current);
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const handleProgressDrag = (e) => {
    if (e.buttons === 1) {
      handleProgressClick(e);
    }
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const changeVolume = (delta) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackSpeed = (speed) => {
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className="player-fullscreen"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: showControls ? 'default' : 'none'
      }}
    >

      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          zIndex: 20,
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.7)',
          border: 'none',
          borderRadius: '50%',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          opacity: showControls ? 1 : 0
        }}
        aria-label="Close player"
      >
        <X className="w-6 h-6" />
      </button>

      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        onClick={togglePlay}
        aria-label="Video player"
      />

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 50%, transparent 100%)',
        padding: '4rem 2rem 2rem',
        transition: 'opacity 0.3s ease',
        opacity: showControls ? 1 : 0,
        cursor: 'default'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>{title}</h3>
        </div>

        {/* Progress Bar */}
        <div 
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseMove={handleProgressDrag}
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '3px',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <div 
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #e50914 0%, #ff6b6b 100%)',
              borderRadius: '3px',
              width: `${progress}%`,
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '14px',
              height: '14px',
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={togglePlay}
              style={{
                padding: '1rem',
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
            </button>

            <button
              onClick={() => skip(-10)}
              style={{
                color: 'white',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                transition: 'transform 0.2s ease'
              }}
              aria-label="Rewind 10 seconds"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={() => skip(10)}
              style={{
                color: 'white',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                transition: 'transform 0.2s ease'
              }}
              aria-label="Forward 10 seconds"
            >
              <SkipForward className="w-6 h-6" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <button
                onClick={toggleMute}
                style={{
                  color: 'white',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  transition: 'transform 0.2s ease'
                }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  videoRef.current.volume = newVolume;
                  setIsMuted(newVolume === 0);
                }}
                style={{
                  width: '80px',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none'
                }}
                aria-label="Volume"
              />
            </div>

            <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: '500', marginLeft: '0.5rem' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Audio Track Selector */}
            {tracks?.audio && tracks.audio.length > 1 && (
              <select
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(Number(e.target.value))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
                aria-label="Audio track"
              >
                {tracks.audio.map((track, i) => (
                  <option key={i} value={i} style={{ background: '#1a1a1a', color: 'white' }}>
                    🔊 {track.language.toUpperCase()} - {track.title}
                  </option>
                ))}
              </select>
            )}

            {/* Settings Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  color: 'white',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  transition: 'transform 0.2s ease'
                }}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {showSettings && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '0.5rem',
                  background: '#1a1a1a',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  minWidth: '150px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{ color: '#888', fontSize: '0.75rem', padding: '0.5rem', fontWeight: '600' }}>
                    PLAYBACK SPEED
                  </div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changePlaybackSpeed(speed)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem',
                        background: playbackSpeed === speed ? 'rgba(229, 9, 20, 0.3)' : 'transparent',
                        border: 'none',
                        color: playbackSpeed === speed ? '#e50914' : 'white',
                        cursor: 'pointer',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {speed}x {speed === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              style={{
                color: 'white',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                transition: 'transform 0.2s ease'
              }}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPlayer;