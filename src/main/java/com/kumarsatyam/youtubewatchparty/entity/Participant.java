package com.kumarsatyam.youtubewatchparty.entity;

import com.kumarsatyam.youtubewatchparty.model.Role;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "participants", indexes = {
    @Index(name = "idx_user_room", columnList = "user_id, room_code", unique = true),
    @Index(name = "idx_room_code_part", columnList = "room_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String roomCode;

    @Column(nullable = false)
    private boolean isOnline;

    @Column(nullable = false, updatable = false)
    private Instant joinedAt;

    @PrePersist
    protected void onJoin() {
        this.joinedAt = Instant.now();
        this.isOnline = true;
    }
}
