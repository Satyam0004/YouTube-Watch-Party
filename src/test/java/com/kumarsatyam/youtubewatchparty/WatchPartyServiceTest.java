package com.kumarsatyam.youtubewatchparty;

import com.kumarsatyam.youtubewatchparty.dto.*;
import com.kumarsatyam.youtubewatchparty.exception.ParticipantNotFoundException;
import com.kumarsatyam.youtubewatchparty.exception.UnauthorizedActionException;
import com.kumarsatyam.youtubewatchparty.model.Role;
import com.kumarsatyam.youtubewatchparty.model.WebSocketEvent;
import com.kumarsatyam.youtubewatchparty.service.RoomService;
import com.kumarsatyam.youtubewatchparty.service.WatchPartyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.jpa.properties.hibernate.hbm2ddl.auto=create-drop",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@Transactional
public class WatchPartyServiceTest {

    @Autowired
    private WatchPartyService watchPartyService;

    @Autowired
    private RoomService roomService;

    @Test
    @DisplayName("Should create a new watch party room and assign HOST role to creator")
    void testCreateRoom() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setUsername("SatyamHost");
        request.setInitialVideoId("dQw4w9WgXcQ");

        RoomResponse response = watchPartyService.createRoom(request);

        assertNotNull(response);
        assertNotNull(response.getRoomCode());
        assertEquals(6, response.getRoomCode().length());
        assertEquals(Role.HOST, response.getRole());
        assertEquals("SatyamHost", response.getUsername());
        assertEquals("dQw4w9WgXcQ", response.getRoomState().getVideoId());
        assertFalse(response.getRoomState().isPlaying());
    }

    @Test
    @DisplayName("Should allow secondary user to join room as PARTICIPANT")
    void testJoinRoom() {
        CreateRoomRequest createReq = new CreateRoomRequest();
        createReq.setUsername("SatyamHost");
        RoomResponse hostRoom = watchPartyService.createRoom(createReq);

        JoinRoomRequest joinReq = new JoinRoomRequest();
        joinReq.setUsername("AliceParticipant");

        RoomResponse participantRoom = watchPartyService.joinRoom(hostRoom.getRoomCode(), joinReq);

        assertNotNull(participantRoom);
        assertEquals(hostRoom.getRoomCode(), participantRoom.getRoomCode());
        assertEquals(Role.PARTICIPANT, participantRoom.getRole());
        assertEquals("AliceParticipant", participantRoom.getUsername());
        assertEquals(2, participantRoom.getParticipants().size());
    }

    @Test
    @DisplayName("Should allow HOST to play video")
    void testHostPlayVideo() {
        CreateRoomRequest createReq = new CreateRoomRequest();
        createReq.setUsername("SatyamHost");
        RoomResponse hostRoom = watchPartyService.createRoom(createReq);

        PlayMessage playMessage = new PlayMessage();
        playMessage.setRoomId(hostRoom.getRoomCode());
        playMessage.setUserId(hostRoom.getUserId());

        WebSocketEvent event = watchPartyService.handlePlay(playMessage);

        assertNotNull(event);
        assertEquals("play", event.getEventType());
        assertTrue(event.getRoomState().isPlaying());
    }

    @Test
    @DisplayName("Should REJECT PARTICIPANT attempting to play video with UnauthorizedActionException")
    void testParticipantPlayVideoRejected() {
        CreateRoomRequest createReq = new CreateRoomRequest();
        createReq.setUsername("SatyamHost");
        RoomResponse hostRoom = watchPartyService.createRoom(createReq);

        JoinRoomRequest joinReq = new JoinRoomRequest();
        joinReq.setUsername("BobParticipant");
        RoomResponse bobRoom = watchPartyService.joinRoom(hostRoom.getRoomCode(), joinReq);

        PlayMessage playMessage = new PlayMessage();
        playMessage.setRoomId(hostRoom.getRoomCode());
        playMessage.setUserId(bobRoom.getUserId());

        assertThrows(UnauthorizedActionException.class, () -> {
            watchPartyService.handlePlay(playMessage);
        });
    }

    @Test
    @DisplayName("Should allow HOST to promote PARTICIPANT to MODERATOR")
    void testAssignRole() {
        CreateRoomRequest createReq = new CreateRoomRequest();
        createReq.setUsername("SatyamHost");
        RoomResponse hostRoom = watchPartyService.createRoom(createReq);

        JoinRoomRequest joinReq = new JoinRoomRequest();
        joinReq.setUsername("CharlieUser");
        RoomResponse charlieRoom = watchPartyService.joinRoom(hostRoom.getRoomCode(), joinReq);

        AssignRoleMessage assignMsg = new AssignRoleMessage();
        assignMsg.setRoomId(hostRoom.getRoomCode());
        assignMsg.setUserId(hostRoom.getUserId());
        assignMsg.setTargetUserId(charlieRoom.getUserId());
        assignMsg.setRole(Role.MODERATOR);

        WebSocketEvent event = watchPartyService.handleAssignRole(assignMsg);

        assertNotNull(event);
        assertEquals("role_assigned", event.getEventType());

        // Now Charlie as MODERATOR should be able to play video
        PlayMessage charliePlay = new PlayMessage();
        charliePlay.setRoomId(hostRoom.getRoomCode());
        charliePlay.setUserId(charlieRoom.getUserId());

        WebSocketEvent playEvent = watchPartyService.handlePlay(charliePlay);
        assertTrue(playEvent.getRoomState().isPlaying());
    }

    @Test
    @DisplayName("Should allow HOST to remove a participant")
    void testRemoveParticipant() {
        CreateRoomRequest createReq = new CreateRoomRequest();
        createReq.setUsername("SatyamHost");
        RoomResponse hostRoom = watchPartyService.createRoom(createReq);

        JoinRoomRequest joinReq = new JoinRoomRequest();
        joinReq.setUsername("DavidUser");
        RoomResponse davidRoom = watchPartyService.joinRoom(hostRoom.getRoomCode(), joinReq);

        RemoveParticipantMessage removeMsg = new RemoveParticipantMessage();
        removeMsg.setRoomId(hostRoom.getRoomCode());
        removeMsg.setUserId(hostRoom.getUserId());
        removeMsg.setTargetUserId(davidRoom.getUserId());

        WebSocketEvent event = watchPartyService.handleRemoveParticipant(removeMsg);
        assertEquals("participant_removed", event.getEventType());

        // Verify David is no longer in room
        assertThrows(ParticipantNotFoundException.class, () -> {
            watchPartyService.getRoomDetails(hostRoom.getRoomCode(), davidRoom.getUserId());
        });
    }

    @Test
    @DisplayName("Should extract YouTube video IDs from various URL formats")
    void testYouTubeUrlExtraction() {
        assertEquals("dQw4w9WgXcQ", roomService.extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"));
        assertEquals("dQw4w9WgXcQ", roomService.extractVideoId("https://youtu.be/dQw4w9WgXcQ"));
        assertEquals("dQw4w9WgXcQ", roomService.extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"));
        assertEquals("dQw4w9WgXcQ", roomService.extractVideoId("dQw4w9WgXcQ"));
    }

    @Test
    @DisplayName("Should process WebRTC voice signal events correctly")
    void testVoiceSignal() {
        CreateRoomRequest createReq = new CreateRoomRequest();
        createReq.setUsername("SatyamHost");
        RoomResponse hostRoom = watchPartyService.createRoom(createReq);

        VoiceSignalMessage signalMsg = new VoiceSignalMessage();
        signalMsg.setRoomId(hostRoom.getRoomCode());
        signalMsg.setSenderUserId(hostRoom.getUserId());
        signalMsg.setSignalType("join");

        WebSocketEvent event = watchPartyService.handleVoiceSignal(signalMsg);

        assertNotNull(event);
        assertEquals("voice_signal", event.getEventType());
        assertEquals(hostRoom.getUserId(), event.getSenderUserId());
    }
}

