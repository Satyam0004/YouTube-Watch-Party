import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

class StompService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscription = null;
  }

  connect(roomId, userId, onEventReceived, onError) {
    const wsUrl = `${BACKEND_URL}/ws`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        this.connected = true;

        // Subscribe to room topic
        this.subscription = this.client.subscribe(`/topic/room/${roomId}`, (message) => {
          try {
            const event = JSON.parse(message.body);
            if (onEventReceived) {
              onEventReceived(event);
            }
          } catch (err) {
            console.error('Error parsing STOMP message:', err);
          }
        });

        // Send join_room event
        this.client.publish({
          destination: '/app/room/join',
          body: JSON.stringify({ roomId, userId }),
        });
      },

      onStompError: (frame) => {
        console.error('STOMP Error:', frame.headers['message']);
        if (onError) onError(frame.headers['message']);
      },

      onDisconnect: () => {
        this.connected = false;
      },
    });

    this.client.activate();
  }

  disconnect(roomId, userId) {
    if (this.client && this.connected) {
      this.client.publish({
        destination: '/app/room/leave',
        body: JSON.stringify({ roomId, userId }),
      });
      if (this.subscription) this.subscription.unsubscribe();
      this.client.deactivate();
    }
  }

  play(roomId, userId) {
    this._publish('/app/room/play', { roomId, userId });
  }

  pause(roomId, userId, currentTime) {
    this._publish('/app/room/pause', { roomId, userId, currentTime });
  }

  seek(roomId, userId, time) {
    this._publish('/app/room/seek', { roomId, userId, time });
  }

  changeVideo(roomId, userId, videoId) {
    this._publish('/app/room/change-video', { roomId, userId, videoId });
  }

  assignRole(roomId, userId, targetUserId, role) {
    this._publish('/app/room/assign-role', { roomId, userId, targetUserId, role });
  }

  removeParticipant(roomId, userId, targetUserId) {
    this._publish('/app/room/remove-participant', { roomId, userId, targetUserId });
  }

  sendChat(roomId, userId, username, message) {
    this._publish('/app/room/chat', { roomId, userId, username, message });
  }

  sendVoiceSignal(roomId, senderUserId, targetUserId, signalType, payload) {
    this._publish('/app/room/voice-signal', {
      roomId,
      senderUserId,
      targetUserId: targetUserId || null,
      signalType,
      payload,
    });
  }


  _publish(destination, body) {
    if (this.client && this.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('STOMP client not connected, cannot publish to:', destination);
    }
  }
}

export const stompService = new StompService();
