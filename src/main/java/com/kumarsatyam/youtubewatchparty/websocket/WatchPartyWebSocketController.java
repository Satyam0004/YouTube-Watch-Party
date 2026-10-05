package com.kumarsatyam.youtubewatchparty.websocket;

import com.kumarsatyam.youtubewatchparty.dto.*;
import com.kumarsatyam.youtubewatchparty.exception.UnauthorizedActionException;
import com.kumarsatyam.youtubewatchparty.model.WebSocketEvent;
import com.kumarsatyam.youtubewatchparty.service.WatchPartyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Slf4j

@Controller
@RequiredArgsConstructor
public class WatchPartyWebSocketController {

    private final WatchPartyService watchPartyService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/room/join")
    public void joinRoom(@Payload Map<String, String> payload) {
        String roomId = payload.get("roomId");
        String userId = payload.get("userId");
        WebSocketEvent event = watchPartyService.handleJoinRoomWS(roomId, userId);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, event);
    }



    @MessageMapping("/room/leave")
    public void leaveRoom(@Payload Map<String, String> payload) {
        String roomId = payload.get("roomId");
        String userId = payload.get("userId");
        WebSocketEvent event = watchPartyService.handleLeaveRoomWS(roomId, userId);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, event);
    }

    @MessageMapping("/room/play")
    public void playVideo(@Payload PlayMessage message) {
        try {
            WebSocketEvent event = watchPartyService.handlePlay(message);
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
        } catch (UnauthorizedActionException e) {
            sendErrorEvent(message.getRoomId(), message.getUserId(), e.getMessage());
        }
    }

    @MessageMapping("/room/pause")
    public void pauseVideo(@Payload PauseMessage message) {
        try {
            WebSocketEvent event = watchPartyService.handlePause(message);
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
        } catch (UnauthorizedActionException e) {
            sendErrorEvent(message.getRoomId(), message.getUserId(), e.getMessage());
        }
    }

    @MessageMapping("/room/seek")
    public void seekVideo(@Payload SeekMessage message) {
        try {
            WebSocketEvent event = watchPartyService.handleSeek(message);
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
        } catch (UnauthorizedActionException e) {
            sendErrorEvent(message.getRoomId(), message.getUserId(), e.getMessage());
        }
    }

    @MessageMapping("/room/change-video")
    public void changeVideo(@Payload ChangeVideoMessage message) {
        try {
            WebSocketEvent event = watchPartyService.handleChangeVideo(message);
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
        } catch (UnauthorizedActionException e) {
            sendErrorEvent(message.getRoomId(), message.getUserId(), e.getMessage());
        }
    }

    @MessageMapping("/room/assign-role")
    public void assignRole(@Payload AssignRoleMessage message) {
        try {
            WebSocketEvent event = watchPartyService.handleAssignRole(message);
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
        } catch (UnauthorizedActionException e) {
            sendErrorEvent(message.getRoomId(), message.getUserId(), e.getMessage());
        }
    }

    @MessageMapping("/room/remove-participant")
    public void removeParticipant(@Payload RemoveParticipantMessage message) {
        try {
            WebSocketEvent event = watchPartyService.handleRemoveParticipant(message);
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
        } catch (UnauthorizedActionException e) {
            sendErrorEvent(message.getRoomId(), message.getUserId(), e.getMessage());
        }
    }

    @MessageMapping("/room/chat")
    public void chatMessage(@Payload ChatMessage message) {
        WebSocketEvent event = watchPartyService.handleChatMessage(message);
        messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
    }

    @MessageMapping("/room/voice-signal")
    public void voiceSignal(@Payload VoiceSignalMessage message) {
        WebSocketEvent event = watchPartyService.handleVoiceSignal(message);
        messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), event);
    }


    @MessageExceptionHandler
    public void handleException(Throwable exception) {
        log.error("WebSocket message handling error: {}", exception.getMessage(), exception);
    }

    private void sendErrorEvent(String roomId, String userId, String errorMessage) {
        WebSocketEvent errorEvent = WebSocketEvent.create(
                "error",
                roomId,
                userId,
                null,
                Map.of("message", errorMessage)
        );
        messagingTemplate.convertAndSend("/topic/room/" + roomId, errorEvent);
    }
}
