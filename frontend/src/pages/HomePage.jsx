import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../services/api';
import { Tv, PlusCircle, LogIn, Sparkles, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create');

  // Create Form State
  const [createUsername, setCreateUsername] = useState('');
  const [initialVideoUrl, setInitialVideoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Form State
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createUsername.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }
    setErrorMsg('');
    setIsCreating(true);

    try {
      const roomData = await createRoom(createUsername.trim(), initialVideoUrl.trim());
      // Save session info in localStorage or navigate state
      sessionStorage.setItem(`user_${roomData.roomId}`, JSON.stringify({
        userId: roomData.userId,
        username: roomData.username,
        role: roomData.role,
      }));

      navigate(`/room/${roomData.roomId}`, {
        state: { roomData, userId: roomData.userId, username: roomData.username, role: roomData.role }
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinRoomCode.trim() || !joinUsername.trim()) {
      setErrorMsg('Please enter room code and username');
      return;
    }
    setErrorMsg('');
    setIsJoining(true);

    try {
      const roomCodeClean = joinRoomCode.trim().toUpperCase();
      const roomData = await joinRoom(roomCodeClean, joinUsername.trim());

      sessionStorage.setItem(`user_${roomData.roomId}`, JSON.stringify({
        userId: roomData.userId,
        username: roomData.username,
        role: roomData.role,
      }));

      navigate(`/room/${roomData.roomId}`, {
        state: { roomData, userId: roomData.userId, username: roomData.username, role: roomData.role }
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Header / Hero Branding */}
      <div style={{ textAlign: 'center', marginBottom: '32px', maxWidth: '600px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '30px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid var(--border-glass-glow)', marginBottom: '16px' }}>
          <Sparkles size={16} color="var(--accent-purple)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-purple)' }}>Real-Time STOMP Synchronized</span>
        </div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
          YouTube <span className="text-gradient-purple">Watch Party</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>
          Watch videos together with friends in real time. Perfectly synchronized video controls, role-based governance, and live chat.
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '32px' }}>
        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1px 1px', display: 'flex', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
          <button
            onClick={() => { setActiveTab('create'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'create' ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' : 'transparent',
              color: activeTab === 'create' ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <PlusCircle size={16} /> Create Room
          </button>
          <button
            onClick={() => { setActiveTab('join'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'join' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'transparent',
              color: activeTab === 'join' ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <LogIn size={16} /> Join Room
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        {/* Create Room Form */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Satyam"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Initial YouTube URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={initialVideoUrl}
                onChange={(e) => setInitialVideoUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isCreating} style={{ marginTop: '8px' }}>
              {isCreating ? 'Creating Room...' : 'Create Watch Party (Host)'}
            </button>
          </form>
        ) : (
          /* Join Room Form */
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. ABC123"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                required
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alice"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isJoining} style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', marginTop: '8px' }}>
              {isJoining ? 'Joining Room...' : 'Join Watch Party'}
            </button>
          </form>
        )}
      </div>

      {/* Feature Pills Footer */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Shield size={14} color="var(--role-host)" /> Authoritative RBAC (Host/Mod/Participant)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Zap size={14} color="var(--accent-cyan)" /> Live Timestamp Synchronization
        </div>
      </div>
    </div>
  );
}
