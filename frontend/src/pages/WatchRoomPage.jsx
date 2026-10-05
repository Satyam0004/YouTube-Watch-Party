import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { stompService } from '../services/stompClient';
import { getRoomDetails } from '../services/api';
import YouTubePlayer from '../components/YouTubePlayer';
import PlaybackControls from '../components/PlaybackControls';
import ParticipantsList from '../components/ParticipantsList';
import ChatPanel from '../components/ChatPanel';
import VoicePanel from '../components/VoicePanel';
import { voiceService } from '../services/voiceService';
import { Copy, Check, LogOut, Users, MessageSquare, Shield, Share2, Radio, PhoneCall } from 'lucide-react';


export default function WatchRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // User session state
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('PARTICIPANT');

  // Room & Playback state
  const [videoId, setVideoId] = useState(() => {
    return location.state?.roomData?.roomState?.videoId || 'dQw4w9WgXcQ';
  });
  const [isPlaying, setIsPlaying] = useState(() => {
    return location.state?.roomData?.roomState?.playing || false;
  });
  const [currentTime, setCurrentTime] = useState(() => {
    return location.state?.roomData?.roomState?.currentTime || 0;
  });
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'chat'
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorToast, setErrorToast] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Flag to suppress local YT player events when remote sync event is received
  const isRemoteAction = useRef(false);

  // Ref to store the latest event handler to avoid stale closure bugs
  const onEventRef = useRef(null);

  useEffect(() => {
    onEventRef.current = (event) => handleWebSocketEvent(event);
  });

  useEffect(() => {
    // 1. Retrieve user credentials from location state or sessionStorage (tab-scoped)
    let savedUser = location.state;
    if (!savedUser || !savedUser.userId) {
      const session = sessionStorage.getItem(`user_${roomId}`);
      if (session) {
        try {
          savedUser = JSON.parse(session);
        } catch (e) {}
      }
    }

    if (!savedUser || !savedUser.userId) {
      // Prompt user to enter username to join if coming directly via link
      const promptName = prompt('Enter your name to join this Watch Party:');
      if (!promptName) {
        navigate('/');
        return;
      }
      // Join via API
      fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: promptName }),
      })
        .then((res) => res.json())
        .then((data) => {
          setUserId(data.userId);
          setUsername(data.username);
          setUserRole(data.role);
          setVideoId(data.roomState.videoId);
          setIsPlaying(data.roomState.playing);
          setCurrentTime(data.roomState.currentTime);
          setParticipants(data.participants || []);

          sessionStorage.setItem(`user_${roomId}`, JSON.stringify({
            userId: data.userId,
            username: data.username,
            role: data.role,
          }));

          initWebSocket(roomId, data.userId);
        })
        .catch((err) => {
          alert('Failed to join room: ' + err.message);
          navigate('/');
        });
      return;
    }

    setUserId(savedUser.userId);
    setUsername(savedUser.username);
    setUserRole(savedUser.role);

    // Initial fetch room details
    getRoomDetails(roomId, savedUser.userId)
      .then((data) => {
        setVideoId(data.roomState.videoId);
        setIsPlaying(data.roomState.playing);
        setCurrentTime(data.roomState.currentTime);
        setParticipants(data.participants || []);
        setUserRole(data.role);
      })
      .catch((err) => console.error('Error fetching room details:', err));

    initWebSocket(roomId, savedUser.userId);

    const handleBeforeUnload = () => {
      voiceService.disconnectVoice();
      if (roomId && savedUser?.userId) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
        try {
          navigator.sendBeacon(`${backendUrl}/api/rooms/${roomId}/leave?userId=${savedUser.userId}`);
        } catch (e) {}
        stompService.disconnect(roomId, savedUser.userId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stompService.disconnect(roomId, savedUser.userId);
    };
  }, [roomId]);



  const initWebSocket = (rId, uId) => {
    stompService.connect(
      rId,
      uId,
      (event) => {
        if (onEventRef.current) {
          onEventRef.current(event);
        }
      },
      (stompErr) => {
        setErrorToast('Connection Error: ' + stompErr);
        setIsConnected(false);
      }
    );
    setIsConnected(true);
  };

  const handleWebSocketEvent = (event) => {
    const { eventType, roomState, payload } = event;

    if (roomState) {
      if (roomState.videoId) {
        setVideoId(roomState.videoId);
      }
      if (roomState.playing !== undefined) {
        setIsPlaying(roomState.playing);
      }
      if (roomState.currentTime !== undefined) {
        setCurrentTime(roomState.currentTime);
      }
    }

    switch (eventType) {
      case 'play':
        isRemoteAction.current = true;
        setIsPlaying(true);
        if (payload?.currentTime !== undefined) setCurrentTime(payload.currentTime);
        break;

      case 'pause':
        isRemoteAction.current = true;
        setIsPlaying(false);
        if (payload?.currentTime !== undefined) setCurrentTime(payload.currentTime);
        break;

      case 'seek':
        isRemoteAction.current = true;
        if (payload?.time !== undefined) setCurrentTime(payload.time);
        break;

      case 'change_video':
        isRemoteAction.current = true;
        if (payload?.videoId) setVideoId(payload.videoId);
        setIsPlaying(false);
        setCurrentTime(0);
        break;

      case 'user_joined':
        if (payload?.participants) setParticipants(payload.participants);
        if (payload?.joinedUsername) {
          appendSystemChat(`${payload.joinedUsername} joined the party`);
        }
        break;

      case 'user_left':
        if (payload?.participants) setParticipants(payload.participants);
        if (payload?.leftUserId) {
          voiceService.handlePeerLeft(payload.leftUserId);
        }
        if (payload?.leftUsername) {
          appendSystemChat(`${payload.leftUsername} left the party`);
        }
        break;

      case 'role_assigned':
        if (payload?.participants) setParticipants(payload.participants);
        if (payload?.targetUserId === userId && payload?.newRole) {
          setUserRole(payload.newRole);
          appendSystemChat(`Your role was updated to ${payload.newRole}`);
        } else if (payload?.targetUsername && payload?.newRole) {
          appendSystemChat(`${payload.targetUsername}'s role changed to ${payload.newRole}`);
        }
        break;

      case 'participant_removed':
        if (payload?.removedUserId === userId) {
          voiceService.disconnectVoice();
          stompService.disconnect(roomId, userId);
          sessionStorage.removeItem(`user_${roomId}`);
          alert('You have been removed from the watch party room by the Host.');
          navigate('/');
          return;
        }
        if (payload?.removedUserId) {
          voiceService.handlePeerLeft(payload.removedUserId);
        }
        if (payload?.participants) setParticipants(payload.participants);
        if (payload?.removedUsername) {
          appendSystemChat(`${payload.removedUsername} was removed from the party`);
        }
        break;


      case 'chat_message':
        setChatMessages((prev) => [...prev, payload]);
        break;

      case 'voice_signal':
        voiceService.handleVoiceSignal(event);
        break;


      case 'error':
        setErrorToast(payload?.message || 'WebSocket Action Rejected');
        setTimeout(() => setErrorToast(''), 4000);
        break;

      default:
        break;
    }
  };

  const appendSystemChat = (msgText) => {
    setChatMessages((prev) => [
      ...prev,
      { isSystem: true, message: msgText, timestamp: Date.now() },
    ]);
  };

  // User Actions
  const handlePlay = (timeSec) => {
    stompService.play(roomId, userId);
  };

  const handlePause = (timeSec) => {
    stompService.pause(roomId, userId, timeSec || currentTime);
  };

  const handleSeek = (timeSec) => {
    stompService.seek(roomId, userId, timeSec);
  };

  const handleChangeVideo = (newVideoInput) => {
    stompService.changeVideo(roomId, userId, newVideoInput);
  };

  const handleAssignRole = (targetUserId, newRole) => {
    stompService.assignRole(roomId, userId, targetUserId, newRole);
  };

  const handleRemoveParticipant = (targetUserId) => {
    if (window.confirm('Are you sure you want to remove this participant?')) {
      stompService.removeParticipant(roomId, userId, targetUserId);
    }
  };

  const handleSendChat = (msgText) => {
    stompService.sendChat(roomId, userId, username, msgText);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeave = () => {
    if (window.confirm('Leave this Watch Party?')) {
      stompService.disconnect(roomId, userId);
      sessionStorage.removeItem(`user_${roomId}`);
      navigate('/');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px', gap: '20px' }}>
      {/* Top Header Bar */}
      <header className="glass-panel" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            YouTube <span className="text-gradient-purple">Watch Party</span>
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CODE:</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--accent-cyan)' }}>{roomId}</span>
            <button onClick={copyRoomCode} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }} title="Copy Code">
              {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>
          </div>

          <button className="btn-secondary" onClick={copyRoomLink} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            {copiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />} Share Link
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isConnected ? '#10b981' : '#ef4444' }}>
            <Radio size={14} className={isConnected ? "pulse-glow" : ""} />
            <span>{isConnected ? 'LIVE STOMP' : 'Connecting...'}</span>
          </div>

          {/* User Role Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)' }}>
            <Shield size={14} color="var(--accent-purple)" />
            <span>{userRole}</span>
          </div>

          <button className="btn-secondary" onClick={handleLeave} style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <LogOut size={16} /> Leave
          </button>
        </div>
      </header>

      {/* Error Toast Notification */}
      {errorToast && (
        <div style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '12px 20px', borderRadius: '10px', fontWeight: 600, boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)', textAlign: 'center' }}>
          ⚠️ {errorToast}
        </div>
      )}

      {/* Main Grid: Player on Left, Sidebar on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '20px', flex: 1 }}>
        {/* Left Column: Player & Playback Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ height: '480px', padding: '8px', display: 'flex' }}>
            <YouTubePlayer
              videoId={videoId}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              isRemoteAction={isRemoteAction}
              userRole={userRole}
            />
          </div>

          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            onPlay={() => handlePlay(currentTime)}
            onPause={() => handlePause(currentTime)}
            onSeek={handleSeek}
            onChangeVideo={handleChangeVideo}
            userRole={userRole}
          />
        </div>

        {/* Right Column: Voice Room, Participants & Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Voice Panel */}
          <VoicePanel
            roomId={roomId}
            userId={userId}
            username={username}
            participants={participants}
          />

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Sidebar Tabs */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', padding: '4px' }}>

            <button
              onClick={() => setActiveTab('participants')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'participants' ? 'var(--bg-card-hover)' : 'transparent',
                color: activeTab === 'participants' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Users size={15} /> Participants ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'chat' ? 'var(--bg-card-hover)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={15} /> Chat ({chatMessages.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'participants' ? (
            <ParticipantsList
              participants={participants}
              currentUserId={userId}
              currentUserRole={userRole}
              onAssignRole={handleAssignRole}
              onRemoveParticipant={handleRemoveParticipant}
            />
          ) : (
            <ChatPanel
              messages={chatMessages}
              onSendChat={handleSendChat}
              currentUserId={userId}
            />
          )}
        </div>
      </div>
    </div>
  </div>
);
}


