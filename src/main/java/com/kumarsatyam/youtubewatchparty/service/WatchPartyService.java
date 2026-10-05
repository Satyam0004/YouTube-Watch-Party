package com.kumarsatyam.youtubewatchparty.service;

import com.kumarsatyam.youtubewatchparty.dto.*;
import com.kumarsatyam.youtubewatchparty.entity.Participant;
import com.kumarsatyam.youtubewatchparty.entity.Room;
import com.kumarsatyam.youtubewatchparty.exception.UnauthorizedActionException;
import com.kumarsatyam.youtubewatchparty.model.Role;
import com.kumarsatyam.youtubewatchparty.model.RoomState;
import com.kumarsatyam.youtubewatchparty.model.WebSocketEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WatchPartyService {

    private final RoomService roomService;
    private final ParticipantService participantService;

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request) {
        String hostUserId = "user-" + UUID.randomUUID().toString().substring(0, 8);
        Room room = roomService.createRoom(hostUserId, request.getInitialVideoId());
        
        Participant hostParticipant = participantService.joinRoom(
                room.getRoomCode(),
                hostUserId,
                request.getUsername(),
                Role.HOST
        );

        RoomState roomState = roomService.getCalculatedRoomState(room.getRoomCode());
        List<ParticipantDto> participants = participantService.getParticipantDtosInRoom(room.getRoomCode());

        return RoomResponse.builder()
                .roomId(room.getRoomCode())
                .roomCode(room.getRoomCode())
                .hostUserId(hostUserId)
                .userId(hostUserId)
                .username(request.getUsername())
                .role(Role.HOST)
                .roomState(roomState)
                .participants(participants)
                .build();
    }

    @Transactional
    public RoomResponse joinRoom(String roomCode, JoinRoomRequest request) {
        Room room = roomService.getRoomByCode(roomCode);
        String userId = "user-" + UUID.randomUUID().toString().substring(0, 8);
        
        Participant participant = participantService.joinRoom(
                room.getRoomCode(),
                userId,
                request.getUsername(),
                Role.PARTICIPANT
        );

        RoomState roomState = roomService.getCalculatedRoomState(room.getRoomCode());
        List<ParticipantDto> participants = participantService.getParticipantDtosInRoom(room.getRoomCode());

        return RoomResponse.builder()
                .roomId(room.getRoomCode())
                .roomCode(room.getRoomCode())
                .hostUserId(room.getHostUserId())
                .userId(userId)
                .username(request.getUsername())
                .role(participant.getRole())
                .roomState(roomState)
                .participants(participants)
                .build();
    }

    public RoomResponse getRoomDetails(String roomCode, String userId) {
        Room room = roomService.getRoomByCode(roomCode);
        Participant participant = participantService.getParticipant(roomCode, userId);
        RoomState roomState = roomService.getCalculatedRoomState(roomCode);
        List<ParticipantDto> participants = participantService.getParticipantDtosInRoom(roomCode);

        return RoomResponse.builder()
                .roomId(room.getRoomCode())
                .roomCode(room.getRoomCode())
                .hostUserId(room.getHostUserId())
                .userId(userId)
                .username(participant.getUsername())
                .role(participant.getRole())
                .roomState(roomState)
                .participants(participants)
                .build();
    }

    @Transactional
    public WebSocketEvent handlePlay(PlayMessage message) {
        Participant caller = validatePlaybackAuthority(message.getRoomId(), message.getUserId());
        RoomState currentState = roomService.getCalculatedRoomState(message.getRoomId());
        
        Room updatedRoom = roomService.updateRoomPlaybackState(
                message.getRoomId(),
                true,
                currentState.getCurrentTime(),
                null
        );

        RoomState newState = roomService.getCalculatedRoomState(message.getRoomId());
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "PLAY");
        payload.put("triggeredBy", caller.getUsername());
        payload.put("currentTime", newState.getCurrentTime());

        return WebSocketEvent.create("play", message.getRoomId(), message.getUserId(), newState, payload);
    }

    @Transactional
    public WebSocketEvent handlePause(PauseMessage message) {
        Participant caller = validatePlaybackAuthority(message.getRoomId(), message.getUserId());
        
        double pauseTime = message.getCurrentTime() != null ? message.getCurrentTime() : roomService.getCalculatedRoomState(message.getRoomId()).getCurrentTime();

        Room updatedRoom = roomService.updateRoomPlaybackState(
                message.getRoomId(),
                false,
                pauseTime,
                null
        );

        RoomState newState = roomService.getCalculatedRoomState(message.getRoomId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "PAUSE");
        payload.put("triggeredBy", caller.getUsername());
        payload.put("currentTime", newState.getCurrentTime());

        return WebSocketEvent.create("pause", message.getRoomId(), message.getUserId(), newState, payload);
    }

    @Transactional
    public WebSocketEvent handleSeek(SeekMessage message) {
        Participant caller = validatePlaybackAuthority(message.getRoomId(), message.getUserId());
        RoomState current = roomService.getCalculatedRoomState(message.getRoomId());

        Room updatedRoom = roomService.updateRoomPlaybackState(
                message.getRoomId(),
                current.isPlaying(),
                message.getTime(),
                null
        );

        RoomState newState = roomService.getCalculatedRoomState(message.getRoomId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "SEEK");
        payload.put("triggeredBy", caller.getUsername());
        payload.put("time", newState.getCurrentTime());

        return WebSocketEvent.create("seek", message.getRoomId(), message.getUserId(), newState, payload);
    }

    @Transactional
    public WebSocketEvent handleChangeVideo(ChangeVideoMessage message) {
        Participant caller = validatePlaybackAuthority(message.getRoomId(), message.getUserId());
        
        String extractedVideoId = roomService.extractVideoId(message.getVideoId());
        
        Room updatedRoom = roomService.updateRoomPlaybackState(
                message.getRoomId(),
                false,
                0.0,
                extractedVideoId
        );

        RoomState newState = roomService.getCalculatedRoomState(message.getRoomId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "CHANGE_VIDEO");
        payload.put("triggeredBy", caller.getUsername());
        payload.put("videoId", extractedVideoId);

        return WebSocketEvent.create("change_video", message.getRoomId(), message.getUserId(), newState, payload);
    }

    @Transactional
    public WebSocketEvent handleAssignRole(AssignRoleMessage message) {
        Participant host = validateHostAuthority(message.getRoomId(), message.getUserId());
        Participant target = participantService.getParticipant(message.getRoomId(), message.getTargetUserId());

        if (message.getRole() == Role.HOST) {
            // Optional host transfer logic
            Room room = roomService.getRoomByCode(message.getRoomId());
            room.setHostUserId(target.getUserId());
            host.setRole(Role.MODERATOR);
            participantService.updateParticipantRole(message.getRoomId(), host.getUserId(), Role.MODERATOR);
            participantService.updateParticipantRole(message.getRoomId(), target.getUserId(), Role.HOST);
        } else {
            participantService.updateParticipantRole(message.getRoomId(), target.getUserId(), message.getRole());
        }

        RoomState state = roomService.getCalculatedRoomState(message.getRoomId());
        List<ParticipantDto> updatedParticipants = participantService.getParticipantDtosInRoom(message.getRoomId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("targetUserId", target.getUserId());
        payload.put("targetUsername", target.getUsername());
        payload.put("newRole", message.getRole());
        payload.put("updatedBy", host.getUsername());
        payload.put("participants", updatedParticipants);

        return WebSocketEvent.create("role_assigned", message.getRoomId(), message.getUserId(), state, payload);
    }

    @Transactional
    public WebSocketEvent handleRemoveParticipant(RemoveParticipantMessage message) {
        Participant host = validateHostAuthority(message.getRoomId(), message.getUserId());
        Participant target = participantService.getParticipant(message.getRoomId(), message.getTargetUserId());

        if (target.getUserId().equals(host.getUserId())) {
            throw new UnauthorizedActionException("Host cannot remove themselves from the room");
        }

        participantService.removeParticipant(message.getRoomId(), target.getUserId());

        RoomState state = roomService.getCalculatedRoomState(message.getRoomId());
        List<ParticipantDto> updatedParticipants = participantService.getParticipantDtosInRoom(message.getRoomId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("removedUserId", target.getUserId());
        payload.put("removedUsername", target.getUsername());
        payload.put("removedBy", host.getUsername());
        payload.put("participants", updatedParticipants);

        return WebSocketEvent.create("participant_removed", message.getRoomId(), message.getUserId(), state, payload);
    }

    public WebSocketEvent handleJoinRoomWS(String roomCode, String userId) {
        Participant participant = participantService.getParticipant(roomCode, userId);
        RoomState state = roomService.getCalculatedRoomState(roomCode);
        List<ParticipantDto> participants = participantService.getParticipantDtosInRoom(roomCode);

        Map<String, Object> payload = new HashMap<>();
        payload.put("joinedUserId", participant.getUserId());
        payload.put("joinedUsername", participant.getUsername());
        payload.put("role", participant.getRole());
        payload.put("participants", participants);

        return WebSocketEvent.create("user_joined", roomCode, userId, state, payload);
    }

    public WebSocketEvent handleLeaveRoomWS(String roomCode, String userId) {
        Participant participant = participantService.getParticipant(roomCode, userId);
        RoomState state = roomService.getCalculatedRoomState(roomCode);
        
        participantService.removeParticipant(roomCode, userId);
        List<ParticipantDto> participants = participantService.getParticipantDtosInRoom(roomCode);

        Map<String, Object> payload = new HashMap<>();
        payload.put("leftUserId", userId);
        payload.put("leftUsername", participant.getUsername());
        payload.put("participants", participants);

        return WebSocketEvent.create("user_left", roomCode, userId, state, payload);
    }

    public WebSocketEvent handleChatMessage(ChatMessage message) {
        Participant participant = participantService.getParticipant(message.getRoomId(), message.getUserId());
        RoomState state = roomService.getCalculatedRoomState(message.getRoomId());

        message.setUsername(participant.getUsername());
        message.setTimestamp(System.currentTimeMillis());

        return WebSocketEvent.create("chat_message", message.getRoomId(), message.getUserId(), state, message);
    }

    public WebSocketEvent handleVoiceSignal(VoiceSignalMessage message) {
        Participant participant = participantService.getParticipant(message.getRoomId(), message.getSenderUserId());
        Map<String, Object> payload = new HashMap<>();
        payload.put("senderUserId", message.getSenderUserId());
        payload.put("senderUsername", participant.getUsername());
        payload.put("targetUserId", message.getTargetUserId());
        payload.put("signalType", message.getSignalType());
        payload.put("data", message.getPayload());

        return WebSocketEvent.create("voice_signal", message.getRoomId(), message.getSenderUserId(), null, payload);
    }


    private Participant validatePlaybackAuthority(String roomCode, String userId) {
        Participant participant = participantService.getParticipant(roomCode, userId);
        if (participant.getRole() != Role.HOST && participant.getRole() != Role.MODERATOR) {
            throw new UnauthorizedActionException("Role " + participant.getRole() + " is not authorized to control video playback");
        }
        return participant;
    }

    private Participant validateHostAuthority(String roomCode, String userId) {
        Participant participant = participantService.getParticipant(roomCode, userId);
        if (participant.getRole() != Role.HOST) {
            throw new UnauthorizedActionException("Only HOST role can perform room management actions");
        }
        return participant;
    }
}
