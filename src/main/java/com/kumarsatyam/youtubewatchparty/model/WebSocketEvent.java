package com.kumarsatyam.youtubewatchparty.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketEvent {
    private String eventType;
    private String roomId;
    private String senderUserId;
    private RoomState roomState;
    private Object payload;
    private long timestamp;

    public static WebSocketEvent create(String eventType, String roomId, String senderUserId, RoomState roomState, Object payload) {
        return WebSocketEvent.builder()
                .eventType(eventType)
                .roomId(roomId)
                .senderUserId(senderUserId)
                .roomState(roomState)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
