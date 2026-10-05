import React from 'react';
import { Shield, ShieldCheck, User, UserX, Crown } from 'lucide-react';

export default function ParticipantsList({
  participants,
  currentUserId,
  currentUserRole,
  onAssignRole,
  onRemoveParticipant,
}) {
  const isHost = currentUserRole === 'HOST';

  const getRoleBadge = (role) => {
    switch (role) {
      case 'HOST':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--role-host)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Crown size={12} /> HOST
          </span>
        );
      case 'MODERATOR':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--role-moderator)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <ShieldCheck size={12} /> MODERATOR
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--role-participant)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <User size={12} /> PARTICIPANT
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
          Participants ({participants.length})
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;

          return (
            <div
              key={p.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                background: isMe ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isMe ? '1px solid var(--border-glass-glow)' : '1px solid var(--border-glass)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {p.username ? p.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: p.isOnline !== false ? '#10b981' : '#64748b',
                      border: '2px solid var(--bg-primary)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {p.username} {isMe && '(You)'}
                  </span>
                  <div>{getRoleBadge(p.role)}</div>
                </div>
              </div>

              {/* Host Action Buttons */}
              {isHost && !isMe && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {p.role === 'PARTICIPANT' && (
                    <button
                      className="btn-secondary"
                      onClick={() => onAssignRole(p.userId, 'MODERATOR')}
                      title="Promote to Moderator"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}
                    >
                      + Mod
                    </button>
                  )}
                  {p.role === 'MODERATOR' && (
                    <button
                      className="btn-secondary"
                      onClick={() => onAssignRole(p.userId, 'PARTICIPANT')}
                      title="Demote to Participant"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      - Mod
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => onRemoveParticipant(p.userId)}
                    title="Remove participant"
                    style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    <UserX size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
