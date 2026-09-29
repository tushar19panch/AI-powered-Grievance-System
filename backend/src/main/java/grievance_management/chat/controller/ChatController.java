package grievance_management.chat.controller;

import grievance_management.chat.dto.ChatMessageRequest;
import grievance_management.chat.dto.ChatMessageResponse;
import grievance_management.chat.service.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatbotService chatbotService;

    public ChatController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    /**
     * Primary Citizen Chatbot Endpoint.
     * Accessible by both logged-in citizens and visitors (to track complaints or ask FAQs).
     */
    @PostMapping
    public ResponseEntity<ChatMessageResponse> chat(
            @RequestBody ChatMessageRequest request,
            Authentication authentication) {

        String username = authentication != null ? authentication.getName() : null;
        ChatMessageResponse response = chatbotService.processMessage(request, username);
        return ResponseEntity.ok(response);
    }
}
