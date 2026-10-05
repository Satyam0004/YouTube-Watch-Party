package com.kumarsatyam.youtubewatchparty.config;

import org.springframework.stereotype.Component;

@Component
public class WebSocketEventListener {
    // No-op to avoid premature participant deletion on raw STOMP transport disconnects
}
