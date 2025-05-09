package io.github.swar101.swalert.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TelegramRequestDto extends BaseNotificationRequestDto {
    private String chatId; 
    private String botToken; 
}  
