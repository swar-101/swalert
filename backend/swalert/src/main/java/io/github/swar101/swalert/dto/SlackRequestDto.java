package io.github.swar101.swalert.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class SlackRequestDto extends BaseNotificationRequestDto {
    private String channel;
    private String webhookUrl; 
}
