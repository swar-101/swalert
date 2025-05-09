package io.github.swar101.swalert.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.github.swar101.swalert.dto.NtfyRequestDto;
import io.github.swar101.swalert.service.NotificationService;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/ntfy")
public class NtfyController {

    private final NotificationService<NtfyRequestDto> notificationService; 

    @Autowired
    public NtfyController(NotificationService<NtfyRequestDto> ntfyService) {
        this.notificationService = ntfyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<Void> send(@RequestBody NtfyRequestDto requestDto) {
        return notificationService.send(requestDto);
    }    
}
