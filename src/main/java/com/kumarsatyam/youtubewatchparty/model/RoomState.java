package com.kumarsatyam.youtubewatchparty.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomState {
    private String roomId;
    private String videoId;
    private boolean playing;
    private double currentTime;
    private long lastStateUpdatedAt;

    public double getCalculatedCurrentTime() {
        if (!playing || lastStateUpdatedAt <= 0) {
            return currentTime;
        }
        long now = System.currentTimeMillis();
        double elapsedSeconds = (now - lastStateUpdatedAt) / 1000.0;
        return currentTime + elapsedSeconds;
    }
}
