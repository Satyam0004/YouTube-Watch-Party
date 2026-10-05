package com.kumarsatyam.youtubewatchparty.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinRoomRequest {
    @NotBlank(message = "Username is required")
    private String username;
}
