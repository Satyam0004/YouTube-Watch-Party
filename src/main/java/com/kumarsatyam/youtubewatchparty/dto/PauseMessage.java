package com.kumarsatyam.youtubewatchparty.dto;

import lombok.Data;

@Data
public class PauseMessage {
    private String roomId;
    private String userId;
    private Double currentTime;
}
