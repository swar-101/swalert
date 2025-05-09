package io.github.swar101.swalert.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true) 
public class NtfyRequestDto extends BaseNotificationRequestDto {
    private String topic;   
    private String priority;
}
