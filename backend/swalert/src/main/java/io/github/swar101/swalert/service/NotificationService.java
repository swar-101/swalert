package io.github.swar101.swalert.service;
import org.springframework.stereotype.Service;

import io.github.swar101.swalert.dto.BaseNotificationRequestDto;
import reactor.core.publisher.Mono;

@Service
public interface NotificationService<T extends BaseNotificationRequestDto> {
    Mono<Void> send(T request); 
}
