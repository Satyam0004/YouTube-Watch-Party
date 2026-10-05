package com.kumarsatyam.youtubewatchparty.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceSignalMessage {
    private String roomId;
    private String senderUserId;
    private String targetUserId;
    private String signalType;
    private Object payload;
}
