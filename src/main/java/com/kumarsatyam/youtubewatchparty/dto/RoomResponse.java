package com.kumarsatyam.youtubewatchparty.dto;

import com.kumarsatyam.youtubewatchparty.model.Role;
import com.kumarsatyam.youtubewatchparty.model.RoomState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {
    private String roomId;
    private String roomCode;
    private String hostUserId;
    private String userId;
    private String username;
    private Role role;
    private RoomState roomState;
    private List<ParticipantDto> participants;
}
