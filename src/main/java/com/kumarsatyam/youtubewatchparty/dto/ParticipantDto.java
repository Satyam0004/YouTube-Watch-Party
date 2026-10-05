package com.kumarsatyam.youtubewatchparty.dto;

import com.kumarsatyam.youtubewatchparty.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantDto {
    private String userId;
    private String username;
    private Role role;
    private boolean isOnline;
    private Instant joinedAt;
}
