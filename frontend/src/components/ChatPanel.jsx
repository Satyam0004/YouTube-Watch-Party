import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';

export default function ChatPanel({ messages, onSendChat, currentUserId }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendChat(input.trim());
      setInput('');
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '350px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 700, fontSize: '1rem' }}>
        <MessageSquare size={18} color="var(--accent-cyan)" />
        <span>Room Live Chat</span>
      </div>

      {/* Messages Scroll Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: 'auto', fontSize: '0.85rem' }}>
            No messages yet. Say hello to the party! 👋
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === currentUserId;
            const isSystem = msg.isSystem || !msg.username;

            if (isSystem) {
              return (
                <div
                  key={index}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--accent-purple)',
                    background: 'rgba(139, 92, 246, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    margin: '4px auto',
                    width: 'fit-content',
                  }}
                >
                  {msg.message}
                </div>
              );
            }

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, color: isMe ? 'var(--accent-cyan)' : 'var(--text-main)' }}>{msg.username}</span>
                  <span>{formatTime(msg.timestamp)}</span>
                </div>
                <div
                  style={{
                    background: isMe ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' : 'rgba(255, 255, 255, 0.07)',
                    color: 'var(--text-main)',
                    padding: '8px 14px',
                    borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    maxWidth: '85%',
                    fontSize: '0.88rem',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Send a chat message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-glass)',
            background: 'rgba(15, 23, 42, 0.7)',
            color: 'var(--text-main)',
            fontSize: '0.88rem',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 14px' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
