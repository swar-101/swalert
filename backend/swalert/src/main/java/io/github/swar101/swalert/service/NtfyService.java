package io.github.swar101.swalert.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import io.github.swar101.swalert.dto.NtfyRequestDto;
import reactor.core.publisher.Mono;

@Service
public class NtfyService implements NotificationService<NtfyRequestDto> {
    
    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${swalert.ntfy.base-url}")
    private String baseUrl; 

    @Value("${swalert.ntfy.topic}") 
    private String defaultTopic; 

    @Override
    public Mono<Void> send(NtfyRequestDto requestDto) {
        String topic = (requestDto.getTopic() != null ? requestDto.getTopic() : defaultTopic);
        WebClient client = webClientBuilder.baseUrl(baseUrl).build();
        return client
            .post()
            .uri("/{topic}", topic)
            .header("Title", requestDto.getTitle())
            .header("Priority", requestDto.getPriority() != null ? requestDto.getPriority(): "default")
            .bodyValue(requestDto.getMessage())
            .retrieve()
            .bodyToMono(Void.class);
    }
}
