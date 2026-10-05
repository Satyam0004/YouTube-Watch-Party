package com.kumarsatyam.youtubewatchparty.controller;

import com.kumarsatyam.youtubewatchparty.dto.CreateRoomRequest;
import com.kumarsatyam.youtubewatchparty.dto.JoinRoomRequest;
import com.kumarsatyam.youtubewatchparty.dto.ParticipantDto;
import com.kumarsatyam.youtubewatchparty.dto.RoomResponse;
import com.kumarsatyam.youtubewatchparty.service.ParticipantService;
import com.kumarsatyam.youtubewatchparty.service.WatchPartyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final WatchPartyService watchPartyService;
    private final ParticipantService participantService;
    private final SimpMessagingTemplate messagingTemplate;


    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        RoomResponse response = watchPartyService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<RoomResponse> joinRoom(
            @PathVariable String roomId,
            @Valid @RequestBody JoinRoomRequest request) {
        RoomResponse response = watchPartyService.joinRoom(roomId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomResponse> getRoom(
            @PathVariable String roomId,
            @RequestParam String userId) {
        RoomResponse response = watchPartyService.getRoomDetails(roomId, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{roomId}/participants")
    public ResponseEntity<List<ParticipantDto>> getParticipants(@PathVariable String roomId) {
        List<ParticipantDto> participants = participantService.getParticipantDtosInRoom(roomId);
        return ResponseEntity.ok(participants);
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable String roomId,
            @RequestParam String userId) {
        var event = watchPartyService.handleLeaveRoomWS(roomId, userId);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, event);
        return ResponseEntity.ok().build();
    }
}

