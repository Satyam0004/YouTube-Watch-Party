package com.kumarsatyam.youtubewatchparty.dto;

import lombok.Data;

@Data
public class ChangeVideoMessage {
    private String roomId;
    private String userId;
    private String videoId;
}
