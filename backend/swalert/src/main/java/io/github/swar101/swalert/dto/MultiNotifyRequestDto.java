package io.github.swar101.swalert.dto;

import java.util.List;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class MultiNotifyRequestDto extends BaseNotificationRequestDto {
    private List<String> channels; 
    private NtfyRequestDto ntfy; 
    private WhatsAppRequestDto whatsApp;
    private SlackRequestDto slack; 
    private TelegramRequestDto telegram; 
} 
