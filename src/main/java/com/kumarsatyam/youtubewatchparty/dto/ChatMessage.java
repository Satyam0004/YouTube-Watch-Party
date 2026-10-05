package com.kumarsatyam.youtubewatchparty.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String roomId;
    private String userId;
    private String username;
    private String message;
    private long timestamp;
}
