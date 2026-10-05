package com.kumarsatyam.youtubewatchparty.dto;

import com.kumarsatyam.youtubewatchparty.model.Role;
import lombok.Data;

@Data
public class AssignRoleMessage {
    private String roomId;
    private String userId;
    private String targetUserId;
    private Role role;
}
