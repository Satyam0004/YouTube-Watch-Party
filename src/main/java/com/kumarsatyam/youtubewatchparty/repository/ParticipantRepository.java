package com.kumarsatyam.youtubewatchparty.repository;

import com.kumarsatyam.youtubewatchparty.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    List<Participant> findByRoomCode(String roomCode);
    Optional<Participant> findByRoomCodeAndUserId(String roomCode, String userId);
    boolean existsByRoomCodeAndUserId(String roomCode, String userId);
    void deleteByRoomCodeAndUserId(String roomCode, String userId);
}
