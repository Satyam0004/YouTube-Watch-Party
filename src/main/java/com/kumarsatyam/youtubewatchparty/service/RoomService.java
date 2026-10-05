package com.kumarsatyam.youtubewatchparty.service;

import com.kumarsatyam.youtubewatchparty.entity.Room;
import com.kumarsatyam.youtubewatchparty.exception.RoomNotFoundException;
import com.kumarsatyam.youtubewatchparty.model.RoomState;
import com.kumarsatyam.youtubewatchparty.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private static final String DEFAULT_VIDEO_ID = "dQw4w9WgXcQ";
    private static final String CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public Room createRoom(String hostUserId, String initialVideoInput) {
        String roomCode = generateUniqueRoomCode();
        String videoId = extractVideoId(initialVideoInput);

        Room room = Room.builder()
                .roomCode(roomCode)
                .hostUserId(hostUserId)
                .videoId(videoId)
                .playing(false)
                .currentTime(0.0)
                .lastStateUpdatedAt(System.currentTimeMillis())
                .build();

        return roomRepository.save(room);
    }

    public Room getRoomByCode(String roomCode) {
        return roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RoomNotFoundException("Room with code " + roomCode + " not found"));
    }

    public RoomState getCalculatedRoomState(String roomCode) {
        Room room = getRoomByCode(roomCode);
        RoomState state = RoomState.builder()
                .roomId(room.getRoomCode())
                .videoId(room.getVideoId())
                .playing(room.isPlaying())
                .currentTime(room.getCurrentTime())
                .lastStateUpdatedAt(room.getLastStateUpdatedAt())
                .build();

        double calculatedTime = state.getCalculatedCurrentTime();
        state.setCurrentTime(calculatedTime);
        return state;
    }

    @Transactional
    public Room updateRoomPlaybackState(String roomCode, Boolean playing, Double currentTime, String videoId) {
        Room room = getRoomByCode(roomCode);
        long now = System.currentTimeMillis();

        if (videoId != null && !videoId.isBlank()) {
            room.setVideoId(extractVideoId(videoId));
            room.setPlaying(false);
            room.setCurrentTime(0.0);
            room.setLastStateUpdatedAt(now);
        } else {
            if (playing != null) {
                room.setPlaying(playing);
            }
            if (currentTime != null) {
                room.setCurrentTime(currentTime);
            }
            room.setLastStateUpdatedAt(now);
        }

        return roomRepository.save(room);
    }

    public String generateUniqueRoomCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
            }
            code = sb.toString();
        } while (roomRepository.existsByRoomCode(code));
        return code;
    }

    public String extractVideoId(String input) {
        if (input == null || input.trim().isEmpty()) {
            return DEFAULT_VIDEO_ID;
        }
        String trimmed = input.trim();
        if (trimmed.matches("^[a-zA-Z0-9_-]{11}$")) {
            return trimmed;
        }

        Pattern pattern = Pattern.compile("(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?|shorts)\\/|.*[?&]v=)|youtu\\.be\\/)([^\"&?\\/\\s]{11})");
        Matcher matcher = pattern.matcher(trimmed);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return DEFAULT_VIDEO_ID;
    }
}
