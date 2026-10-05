package com.kumarsatyam.youtubewatchparty.service;

import com.kumarsatyam.youtubewatchparty.dto.ParticipantDto;
import com.kumarsatyam.youtubewatchparty.entity.Participant;
import com.kumarsatyam.youtubewatchparty.exception.ParticipantNotFoundException;
import com.kumarsatyam.youtubewatchparty.model.Role;
import com.kumarsatyam.youtubewatchparty.repository.ParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParticipantService {

    private final ParticipantRepository participantRepository;

    @Transactional
    public Participant joinRoom(String roomCode, String userId, String username, Role role) {
        Optional<Participant> existingOpt = participantRepository.findByRoomCodeAndUserId(roomCode, userId);
        if (existingOpt.isPresent()) {
            Participant existing = existingOpt.get();
            existing.setOnline(true);
            if (username != null && !username.isBlank()) {
                existing.setUsername(username);
            }
            return participantRepository.save(existing);
        }

        Participant participant = Participant.builder()
                .roomCode(roomCode)
                .userId(userId)
                .username(username)
                .role(role)
                .isOnline(true)
                .build();

        return participantRepository.save(participant);
    }

    public Participant getParticipant(String roomCode, String userId) {
        return participantRepository.findByRoomCodeAndUserId(roomCode, userId)
                .orElseThrow(() -> new ParticipantNotFoundException("User " + userId + " is not a participant of room " + roomCode));
    }

    public List<Participant> getParticipantsInRoom(String roomCode) {
        return participantRepository.findByRoomCode(roomCode);
    }

    public List<ParticipantDto> getParticipantDtosInRoom(String roomCode) {
        return getParticipantsInRoom(roomCode).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateParticipantRole(String roomCode, String targetUserId, Role newRole) {
        Participant participant = getParticipant(roomCode, targetUserId);
        participant.setRole(newRole);
        participantRepository.save(participant);
    }

    @Transactional
    public void removeParticipant(String roomCode, String targetUserId) {
        if (!participantRepository.existsByRoomCodeAndUserId(roomCode, targetUserId)) {
            throw new ParticipantNotFoundException("Participant " + targetUserId + " not found in room " + roomCode);
        }
        participantRepository.deleteByRoomCodeAndUserId(roomCode, targetUserId);
    }

    public boolean isUserInRoom(String roomCode, String userId) {
        return participantRepository.existsByRoomCodeAndUserId(roomCode, userId);
    }

    public ParticipantDto convertToDto(Participant participant) {
        return ParticipantDto.builder()
                .userId(participant.getUserId())
                .username(participant.getUsername())
                .role(participant.getRole())
                .isOnline(participant.isOnline())
                .joinedAt(participant.getJoinedAt())
                .build();
    }
}
