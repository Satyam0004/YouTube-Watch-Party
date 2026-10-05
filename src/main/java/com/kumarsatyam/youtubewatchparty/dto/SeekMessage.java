package com.kumarsatyam.youtubewatchparty.dto;

import lombok.Data;

@Data
public class SeekMessage {
    private String roomId;
    private String userId;
    private double time;
}
