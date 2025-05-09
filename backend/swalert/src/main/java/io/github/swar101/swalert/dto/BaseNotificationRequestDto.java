package io.github.swar101.swalert.dto;

import lombok.Data;

@Data
public abstract class BaseNotificationRequestDto {
    private String title;  
    private String message; 
}
