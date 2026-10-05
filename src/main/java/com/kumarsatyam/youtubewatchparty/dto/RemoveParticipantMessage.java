package com.kumarsatyam.youtubewatchparty.dto;

import lombok.Data;

@Data
public class RemoveParticipantMessage {
    private String roomId;
    private String userId;
    private String targetUserId;
}
