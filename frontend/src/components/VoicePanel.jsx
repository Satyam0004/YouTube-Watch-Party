import React, { useState, useEffect, useRef } from 'react';
import { voiceService, soundSynth } from '../services/voiceService';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  PhoneCall,
  Settings,
  Sliders,
  Radio,
  Activity,
  User,
  X,
  Volume1,
  Check,
} from 'lucide-react';

export default function VoicePanel({ roomId, userId, username, participants }) {
  const [voiceState, setVoiceState] = useState({
    isVoiceConnected: false,
    isMicMuted: false,
    isDeafened: false,
    isPushToTalk: false,
    isPTTTalking: false,
    connectedPeersCount: 0,
    voiceStates: {},
  });

  const [localVolume, setLocalVolume] = useState(0);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Per-user volume popup menu state
  const [activeUserVolumeMenu, setActiveUserVolumeMenu] = useState(null);

  useEffect(() => {
    // Subscribe to voiceService state changes
    const unsubscribeState = voiceService.subscribeState((newState) => {
      setVoiceState(newState);
    });

    // Subscribe to local audio volume changes
    const unsubscribeVolume = voiceService.subscribeLocalVolume((vol, speaking) => {
      setLocalVolume(vol);
      setIsLocalSpeaking(speaking);
    });

    // Handle Push-To-Talk key press listener (Spacebar or 'V' key)
    const handleKeyDown = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        // Prevent typing 'v' in input/textarea from triggering PTT
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        voiceService.setPTTTalking(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        voiceService.setPTTTalking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      unsubscribeState();
      unsubscribeVolume();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleToggleConnect = async () => {
    if (voiceState.isVoiceConnected) {
      voiceService.disconnectVoice();
    } else {
      setIsConnecting(true);
      await voiceService.connectVoice(roomId, userId, username, selectedDeviceId || null);
      setIsConnecting(false);

      // Load available audio devices for settings
      const devices = await voiceService.getAvailableDevices();
      setAudioDevices(devices);
    }
  };

  const handleOpenSettings = async () => {
    const devices = await voiceService.getAvailableDevices();
    setAudioDevices(devices);
    setShowSettings(true);
  };

  const handleDeviceChange = async (e) => {
    const devId = e.target.value;
    setSelectedDeviceId(devId);
    if (voiceState.isVoiceConnected) {
      voiceService.disconnectVoice();
      await voiceService.connectVoice(roomId, userId, username, devId);
    }
  };

  // Build connected voice participants list (including local user)
  const connectedUserIds = Object.keys(voiceState.voiceStates);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Active Voice Room Card / Grid */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          borderRadius: '16px',
          border: voiceState.isVoiceConnected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-glass)',
          boxShadow: voiceState.isVoiceConnected ? '0 0 20px rgba(139, 92, 246, 0.2)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: voiceState.isVoiceConnected ? '#10b981' : '#64748b',
                boxShadow: voiceState.isVoiceConnected ? '0 0 10px #10b981' : 'none',
              }}
              className={voiceState.isVoiceConnected ? 'pulse-glow' : ''}
            />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
              LIVE VOICE ROOM {voiceState.isVoiceConnected && `(${connectedUserIds.length})`}
            </h3>
          </div>

          {!voiceState.isVoiceConnected ? (
            <button
              className="btn-primary"
              onClick={handleToggleConnect}
              disabled={isConnecting}
              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px' }}
            >
              <PhoneCall size={14} /> {isConnecting ? 'Connecting...' : 'Join Voice'}
            </button>
          ) : (
            <button
              onClick={handleOpenSettings}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              title="Voice Settings"
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        {/* If Voice is Not Connected */}
        {!voiceState.isVoiceConnected && (
          <div
            style={{
              padding: '20px 10px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Radio size={28} color="var(--accent-purple)" style={{ opacity: 0.6 }} />
            <span>Connect to live voice to talk with friends while watching!</span>
          </div>
        )}

        {/* If Voice Connected: Show Avatars Grid */}
        {voiceState.isVoiceConnected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '12px',
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {connectedUserIds.map((uId) => {
                const uState = voiceState.voiceStates[uId] || {};
                const isMe = uId === userId;
                const displayName = isMe ? `${username} (You)` : uState.username || 'Friend';
                const isSpeaking = isMe ? isLocalSpeaking : uState.isSpeaking;
                const isMuted = isMe ? voiceState.isMicMuted : uState.isMuted;
                const isDeaf = isMe ? voiceState.isDeafened : uState.isDeafened;
                const volLevel = isMe ? localVolume : uState.volumeLevel || 0;

                return (
                  <div
                    key={uId}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 8px',
                      borderRadius: '12px',
                      background: isSpeaking ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSpeaking
                        ? '2px solid #8b5cf6'
                        : '1px solid var(--border-glass)',
                      boxShadow: isSpeaking ? '0 0 16px rgba(139, 92, 246, 0.4)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Talking Avatar Ring */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          boxShadow: isSpeaking ? '0 0 14px #a855f7' : 'none',
                          transform: isSpeaking ? 'scale(1.06)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Speaking Pulse Badge */}
                      {isSpeaking && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid var(--bg-primary)',
                            boxShadow: '0 0 8px #10b981',
                          }}
                        />
                      )}
                    </div>

                    {/* Username */}
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: isSpeaking ? '#a78bfa' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '110px',
                        textAlign: 'center',
                      }}
                    >
                      {displayName}
                    </span>

                    {/* Status Icons (Mic Muted / Deafened) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      {isMuted && (
                        <span
                          title="Microphone Muted"
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <MicOff size={12} />
                        </span>
                      )}
                      {isDeaf && (
                        <span
                          title="Audio Deafened"
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <VolumeX size={12} />
                        </span>
                      )}
                      {!isMuted && !isDeaf && (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                          <Mic size={12} />
                        </span>
                      )}
                    </div>

                    {/* Mini Decibel Volume Meter Bar */}
                    <div
                      style={{
                        width: '80%',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '2px',
                        marginTop: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${isSpeaking ? Math.min(100, Math.max(20, volLevel * 2)) : 0}%`,
                          background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                          transition: 'width 0.1s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Sticky Voice Controls Bar */}
      {voiceState.isVoiceConnected && (
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderRadius: '16px',
            background: 'rgba(18, 21, 38, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Status info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <Radio size={18} className="pulse-glow" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Voice Connected
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {connectedUserIds.length} {connectedUserIds.length === 1 ? 'user' : 'users'} in call
              </span>
            </div>
          </div>

          {/* Local Audio Visualizer Animation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px' }}>
            {[0.4, 0.8, 0.5, 1.0, 0.6, 0.9].map((multiplier, idx) => {
              const barHeight = isLocalSpeaking
                ? Math.min(24, Math.max(4, (localVolume / 4) * multiplier))
                : 4;
              return (
                <div
                  key={idx}
                  style={{
                    width: '3px',
                    height: `${barHeight}px`,
                    background: isLocalSpeaking
                      ? 'linear-gradient(180deg, #ec4899 0%, #8b5cf6 100%)'
                      : 'rgba(148, 163, 184, 0.3)',
                    borderRadius: '3px',
                    transition: 'height 0.1s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Controls Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mic Toggle Button */}
            <button
              onClick={() => voiceService.toggleMute()}
              title={voiceState.isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: 'none',
                background: voiceState.isMicMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: voiceState.isMicMuted ? '#ef4444' : 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {voiceState.isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Deafen Toggle Button */}
            <button
              onClick={() => voiceService.toggleDeafen()}
              title={voiceState.isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: 'none',
                background: voiceState.isDeafened ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: voiceState.isDeafened ? '#ef4444' : 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {voiceState.isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Settings Modal Toggle */}
            <button
              onClick={handleOpenSettings}
              title="Voice Settings"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <Sliders size={18} />
            </button>

            {/* Disconnect Voice */}
            <button
              onClick={handleToggleConnect}
              title="Disconnect Voice"
              style={{
                padding: '0 16px',
                height: '42px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              }}
            >
              <PhoneOff size={16} /> Leave Voice
            </button>
          </div>
        </div>
      )}

      {/* Voice Settings Modal */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '420px',
              padding: '24px',
              borderRadius: '20px',
              background: '#121526',
              border: '1px solid var(--border-glass-glow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="var(--accent-purple)" /> Voice Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Microphone Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                INPUT DEVICE (MICROPHONE)
              </label>
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-glass)',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                <option value="">Default Microphone</option>
                {audioDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Microphone (${dev.deviceId.substring(0, 8)})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Mic Test Meter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--text-muted)' }}>MIC TEST LEVEL</span>
                <span style={{ color: isLocalSpeaking ? '#10b981' : 'var(--text-dim)' }}>
                  {isLocalSpeaking ? 'Speaking' : 'Silent'}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, localVolume * 1.5)}%`,
                    background: 'linear-gradient(90deg, #10b981 0%, #ec4899 100%)',
                    transition: 'width 0.08s ease',
                  }}
                />
              </div>
            </div>

            {/* Push To Talk Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Push-to-Talk Mode</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Hold 'V' key on keyboard to speak
                </span>
              </div>
              <input
                type="checkbox"
                checked={voiceState.isPushToTalk}
                onChange={(e) => voiceService.setPushToTalkMode(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={() => setShowSettings(false)}
              style={{ width: '100%', borderRadius: '12px' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
