package com.kumarsatyam.youtubewatchparty.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "rooms", indexes = {
    @Index(name = "idx_room_code", columnList = "room_code", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String roomCode;

    @Column(nullable = false)
    private String hostUserId;

    @Column(nullable = false)
    private String videoId;

    @Column(nullable = false)
    private boolean playing;

    @Column(name = "current_time_seconds", nullable = false)
    private double currentTime;

    @Column(nullable = false)
    private long lastStateUpdatedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        if (this.lastStateUpdatedAt == 0) {
            this.lastStateUpdatedAt = System.currentTimeMillis();
        }
    }
}
