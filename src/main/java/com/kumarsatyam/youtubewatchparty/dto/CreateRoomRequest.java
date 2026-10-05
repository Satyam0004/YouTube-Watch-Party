package com.kumarsatyam.youtubewatchparty.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateRoomRequest {
    @NotBlank(message = "Username is required")
    private String username;

    private String initialVideoId;
}
