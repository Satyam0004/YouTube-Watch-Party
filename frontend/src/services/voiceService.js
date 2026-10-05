import { stompService } from './stompClient';

// STUN Servers configuration for WebRTC Peer Connections
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Web Audio API Sound Synthesizer for UI audio feedback
class SoundSynthesizer {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, delay = 0, gainVal = 0.15) {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      console.warn('Synth error:', e);
    }
  }

  playJoinChime() {
    this.playTone(523.25, 'sine', 0.12, 0, 0.12); // C5
    this.playTone(659.25, 'sine', 0.18, 0.1, 0.15); // E5
    this.playTone(783.99, 'sine', 0.25, 0.2, 0.18); // G5
  }

  playLeaveChime() {
    this.playTone(783.99, 'sine', 0.12, 0, 0.15); // G5
    this.playTone(659.25, 'sine', 0.15, 0.1, 0.12); // E5
    this.playTone(523.25, 'sine', 0.22, 0.2, 0.10); // C5
  }

  playMuteSound(isMuted) {
    if (isMuted) {
      this.playTone(400, 'triangle', 0.1, 0, 0.1);
      this.playTone(280, 'triangle', 0.12, 0.08, 0.08);
    } else {
      this.playTone(300, 'triangle', 0.1, 0, 0.08);
      this.playTone(500, 'triangle', 0.12, 0.08, 0.1);
    }
  }
}

export const soundSynth = new SoundSynthesizer();

class VoiceService {
  constructor() {
    this.roomId = null;
    this.userId = null;
    this.username = null;

    this.localStream = null;
    this.audioContext = null;
    this.analyser = null;

    this.peerConnections = new Map(); // targetUserId -> RTCPeerConnection
    this.remoteStreams = new Map();    // targetUserId -> MediaStream
    this.remoteAudioElements = new Map(); // targetUserId -> HTMLAudioElement

    this.voiceStates = new Map(); // userId -> { isMuted, isDeafened, isSpeaking, volumeLevel }

    this.isVoiceConnected = false;
    this.isMicMuted = false;
    this.isDeafened = false;
    this.isPushToTalk = false;
    this.isPTTTalking = false;

    this.userVolumes = new Map(); // targetUserId -> gain level (0 to 1.5)
    this.mutedUsers = new Set();  // targetUserId

    this.onVoiceStateChangeCallbacks = new Set();
    this.onLocalVolumeCallbacks = new Set();
    this.animFrameId = null;
  }

  subscribeState(callback) {
    this.onVoiceStateChangeCallbacks.add(callback);
    return () => this.onVoiceStateChangeCallbacks.delete(callback);
  }

  subscribeLocalVolume(callback) {
    this.onLocalVolumeCallbacks.add(callback);
    return () => this.onLocalVolumeCallbacks.delete(callback);
  }

  notifyState() {
    const statesObj = {};
    this.voiceStates.forEach((val, key) => {
      statesObj[key] = { ...val };
    });

    const stateSummary = {
      isVoiceConnected: this.isVoiceConnected,
      isMicMuted: this.isMicMuted,
      isDeafened: this.isDeafened,
      isPushToTalk: this.isPushToTalk,
      isPTTTalking: this.isPTTTalking,
      connectedPeersCount: this.peerConnections.size,
      voiceStates: statesObj,
    };

    this.onVoiceStateChangeCallbacks.forEach((cb) => cb(stateSummary));
  }

  async getAvailableDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch (e) {
      console.warn('Error enumerating audio devices:', e);
      return [];
    }
  }

  async connectVoice(roomId, userId, username, preferredDeviceId = null) {
    this.roomId = roomId;
    this.userId = userId;
    this.username = username;

    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : {}),
        },
        video: false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isMicMuted = false;
      this.isVoiceConnected = true;

      // Setup audio analyzer for local voice activity detection
      this.setupAudioAnalysis();

      soundSynth.playJoinChime();

      // Set initial local state in voiceStates map
      this.voiceStates.set(this.userId, {
        userId: this.userId,
        username: this.username,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        volumeLevel: 0,
      });

      // Broadcast join event via STOMP
      stompService.sendVoiceSignal(this.roomId, this.userId, null, 'join', {
        username: this.username,
        isMuted: this.isMicMuted,
        isDeafened: this.isDeafened,
      });

      this.notifyState();
      return true;
    } catch (err) {
      console.error('Failed to access microphone for voice chat:', err);
      // Fallback: If microphone access is denied or not found, connect in listen-only/virtual voice mode
      this.isVoiceConnected = true;
      this.isMicMuted = true;
      this.localStream = null;

      soundSynth.playJoinChime();

      this.voiceStates.set(this.userId, {
        userId: this.userId,
        username: this.username,
        isMuted: true,
        isDeafened: false,
        isSpeaking: false,
        volumeLevel: 0,
      });

      stompService.sendVoiceSignal(this.roomId, this.userId, null, 'join', {
        username: this.username,
        isMuted: true,
        isDeafened: this.isDeafened,
      });

      this.notifyState();
      return false;
    }
  }

  disconnectVoice() {
    if (!this.isVoiceConnected) return;

    soundSynth.playLeaveChime();

    // Broadcast leave signal
    if (this.roomId && this.userId) {
      stompService.sendVoiceSignal(this.roomId, this.userId, null, 'leave', {});
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Remove remote audio elements
    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    this.remoteAudioElements.clear();
    this.remoteStreams.clear();
    this.voiceStates.clear();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.isVoiceConnected = false;
    this.notifyState();
  }

  toggleMute() {
    if (!this.isVoiceConnected) return;
    this.isMicMuted = !this.isMicMuted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMicMuted;
      });
    }

    soundSynth.playMuteSound(this.isMicMuted);
    this.broadcastVoiceStatus();
    this.notifyState();
  }

  toggleDeafen() {
    if (!this.isVoiceConnected) return;
    this.isDeafened = !this.isDeafened;

    // Mute or unmute all remote audio elements
    this.remoteAudioElements.forEach((el, targetId) => {
      el.muted = this.isDeafened || this.mutedUsers.has(targetId);
    });

    soundSynth.playMuteSound(this.isDeafened);
    this.broadcastVoiceStatus();
    this.notifyState();
  }

  setPushToTalkMode(enabled) {
    this.isPushToTalk = enabled;
    if (enabled && !this.isPTTTalking && this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    } else if (!enabled && !this.isMicMuted && this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
    this.notifyState();
  }

  setPTTTalking(talking) {
    if (!this.isPushToTalk || !this.isVoiceConnected) return;
    this.isPTTTalking = talking;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = talking && !this.isMicMuted;
      });
    }

    this.broadcastVoiceStatus();
    this.notifyState();
  }

  setUserVolume(targetUserId, volume) {
    this.userVolumes.set(targetUserId, volume);
    const audioEl = this.remoteAudioElements.get(targetUserId);
    if (audioEl) {
      audioEl.volume = Math.min(1.0, Math.max(0, volume));
    }
    this.notifyState();
  }

  toggleUserMute(targetUserId) {
    if (this.mutedUsers.has(targetUserId)) {
      this.mutedUsers.delete(targetUserId);
    } else {
      this.mutedUsers.add(targetUserId);
    }

    const audioEl = this.remoteAudioElements.get(targetUserId);
    if (audioEl) {
      audioEl.muted = this.isDeafened || this.mutedUsers.has(targetUserId);
    }
    this.notifyState();
  }

  broadcastVoiceStatus() {
    if (!this.isVoiceConnected || !this.roomId || !this.userId) return;
    const myState = this.voiceStates.get(this.userId) || {};
    stompService.sendVoiceSignal(this.roomId, this.userId, null, 'status', {
      isMuted: this.isMicMuted,
      isDeafened: this.isDeafened,
      isSpeaking: myState.isSpeaking || false,
    });
  }

  setupAudioAnalysis() {
    if (!this.localStream) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastSpeaking = false;

      const checkVolume = () => {
        if (!this.isVoiceConnected || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const volumeLevel = Math.min(100, Math.round((average / 128) * 100));

        const isSpeaking = !this.isMicMuted && volumeLevel > 15;

        // Notify local volume subscribers
        this.onLocalVolumeCallbacks.forEach((cb) => cb(volumeLevel, isSpeaking));

        const myState = this.voiceStates.get(this.userId) || { userId: this.userId, username: this.username };
        myState.volumeLevel = volumeLevel;

        if (isSpeaking !== lastSpeaking) {
          lastSpeaking = isSpeaking;
          myState.isSpeaking = isSpeaking;
          this.voiceStates.set(this.userId, myState);
          this.broadcastVoiceStatus();
          this.notifyState();
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('AudioContext analysis failed:', e);
    }
  }

  // WebRTC Signal Processing from STOMP
  handleVoiceSignal(event) {
    if (!this.isVoiceConnected) return;

    const { senderUserId, targetUserId, signalType, data, senderUsername } = event.payload;

    // Ignore signals originating from myself
    if (senderUserId === this.userId) return;

    // If signal has a specific target and it's not me, ignore
    if (targetUserId && targetUserId !== this.userId) return;

    switch (signalType) {
      case 'join':
        console.log(`[Voice] ${senderUsername} joined voice room. Creating peer connection offer.`);
        this.voiceStates.set(senderUserId, {
          userId: senderUserId,
          username: senderUsername || data?.username || 'Friend',
          isMuted: data?.isMuted || false,
          isDeafened: data?.isDeafened || false,
          isSpeaking: false,
          volumeLevel: 0,
        });
        // Initiate offer to joining peer
        this.createPeerConnectionAndOffer(senderUserId, senderUsername);
        this.notifyState();
        break;

      case 'offer':
        console.log(`[Voice] Received WebRTC offer from ${senderUsername}`);
        this.voiceStates.set(senderUserId, {
          userId: senderUserId,
          username: senderUsername || 'Friend',
          isMuted: false,
          isDeafened: false,
          isSpeaking: false,
          volumeLevel: 0,
        });
        this.handleOffer(senderUserId, data.sdp, senderUsername);
        this.notifyState();
        break;

      case 'answer':
        console.log(`[Voice] Received WebRTC answer from ${senderUsername}`);
        this.handleAnswer(senderUserId, data.sdp);
        break;

      case 'ice-candidate':
        this.handleIceCandidate(senderUserId, data.candidate);
        break;

      case 'status':
        if (this.voiceStates.has(senderUserId)) {
          const current = this.voiceStates.get(senderUserId);
          this.voiceStates.set(senderUserId, {
            ...current,
            isMuted: data.isMuted !== undefined ? data.isMuted : current.isMuted,
            isDeafened: data.isDeafened !== undefined ? data.isDeafened : current.isDeafened,
            isSpeaking: data.isSpeaking !== undefined ? data.isSpeaking : current.isSpeaking,
          });
          this.notifyState();
        }
        break;

      case 'leave':
        console.log(`[Voice] ${senderUsername} left voice room.`);
        this.handlePeerLeft(senderUserId);
        break;

      default:
        break;
    }
  }

  handlePeerLeft(targetUserId) {
    if (targetUserId === this.userId) {
      this.disconnectVoice();
    } else {
      console.log(`[Voice] Participant ${targetUserId} left/removed. Cleaning up peer connection.`);
      this.closePeerConnection(targetUserId);
      this.voiceStates.delete(targetUserId);
      this.notifyState();
    }
  }


  async createPeerConnectionAndOffer(targetUserId, targetUsername) {
    const pc = this.createPeerConnection(targetUserId, targetUsername);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      stompService.sendVoiceSignal(this.roomId, this.userId, targetUserId, 'offer', {
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error('Error creating offer for peer:', targetUserId, err);
    }
  }

  async handleOffer(targetUserId, sdp, targetUsername) {
    const pc = this.createPeerConnection(targetUserId, targetUsername);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      stompService.sendVoiceSignal(this.roomId, this.userId, targetUserId, 'answer', {
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error('Error handling offer from peer:', targetUserId, err);
    }
  }

  async handleAnswer(targetUserId, sdp) {
    const pc = this.peerConnections.get(targetUserId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error setting remote description answer:', err);
      }
    }
  }

  async handleIceCandidate(targetUserId, candidateData) {
    const pc = this.peerConnections.get(targetUserId);
    if (pc && candidateData) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  }

  createPeerConnection(targetUserId, targetUsername) {
    if (this.peerConnections.has(targetUserId)) {
      this.closePeerConnection(targetUserId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks if microphone is available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        stompService.sendVoiceSignal(this.roomId, this.userId, targetUserId, 'ice-candidate', {
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming audio stream from remote peer
    pc.ontrack = (event) => {
      console.log(`[Voice] Received remote audio track from ${targetUsername || targetUserId}`);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStreams.set(targetUserId, remoteStream);

      // Create HTML Audio element for playback
      let audioEl = this.remoteAudioElements.get(targetUserId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(targetUserId, audioEl);
      }

      audioEl.srcObject = remoteStream;
      audioEl.muted = this.isDeafened || this.mutedUsers.has(targetUserId);
      
      const customVol = this.userVolumes.get(targetUserId);
      if (customVol !== undefined) {
        audioEl.volume = Math.min(1.0, Math.max(0, customVol));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Peer ${targetUserId} connection state:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.closePeerConnection(targetUserId);
      }
    };

    this.peerConnections.set(targetUserId, pc);
    return pc;
  }

  closePeerConnection(targetUserId) {
    const pc = this.peerConnections.get(targetUserId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetUserId);
    }

    const audioEl = this.remoteAudioElements.get(targetUserId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudioElements.delete(targetUserId);
    }

    this.remoteStreams.delete(targetUserId);
  }
}

export const voiceService = new VoiceService();
