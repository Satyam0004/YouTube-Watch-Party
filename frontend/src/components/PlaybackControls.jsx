import React, { useState } from 'react';
import { Play, Pause, SkipForward, ShieldAlert, Video } from 'lucide-react';

export default function PlaybackControls({
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onSeek,
  onChangeVideo,
  userRole,
}) {
  const [videoInput, setVideoInput] = useState('');
  const [seekInput, setSeekInput] = useState('');
  const isControlAllowed = userRole === 'HOST' || userRole === 'MODERATOR';

  const handleVideoSubmit = (e) => {
    e.preventDefault();
    if (videoInput.trim() && isControlAllowed) {
      onChangeVideo(videoInput.trim());
      setVideoInput('');
    }
  };

  const handleSeekSubmit = (e) => {
    e.preventDefault();
    const timeNum = parseFloat(seekInput);
    if (!isNaN(timeNum) && timeNum >= 0 && isControlAllowed) {
      onSeek(timeNum);
      setSeekInput('');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Change Video Bar */}
      <form onSubmit={handleVideoSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Video style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder={isControlAllowed ? "Paste YouTube Video URL or Video ID..." : "Only Host or Moderator can change video"}
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            disabled={!isControlAllowed}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              outline: 'none',
              opacity: isControlAllowed ? 1 : 0.6,
            }}
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={!isControlAllowed || !videoInput.trim()}
          style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}
        >
          Load Video
        </button>
      </form>

      {/* Control Actions Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isControlAllowed ? (
            isPlaying ? (
              <button
                className="btn-primary"
                onClick={onPause}
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
              >
                <Pause size={18} /> Pause
              </button>
            ) : (
              <button className="btn-primary" onClick={onPlay}>
                <Play size={18} /> Play
              </button>
            )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--role-participant)', fontSize: '0.9rem', fontWeight: 500 }}>
              <ShieldAlert size={18} />
              <span>Watch-only mode (Host or Moderator controls playback)</span>
            </div>
          )}

          <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--accent-cyan)' }}>
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Seek Bar / Form */}
        {isControlAllowed && (
          <form onSubmit={handleSeekSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Seek time (s)"
              value={seekInput}
              onChange={(e) => setSeekInput(e.target.value)}
              style={{
                width: '120px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '8px 14px' }}>
              <SkipForward size={16} /> Seek
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
