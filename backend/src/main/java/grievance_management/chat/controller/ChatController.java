package grievance_management.chat.controller;

import grievance_management.ai.service.AiService;
import grievance_management.chat.dto.ChatMessageRequest;
import grievance_management.chat.dto.ChatMessageResponse;
import grievance_management.chat.service.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatbotService chatbotService;
    private final AiService aiService;

    public ChatController(ChatbotService chatbotService, AiService aiService) {
        this.chatbotService = chatbotService;
        this.aiService = aiService;
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

    /**
     * Speech-to-Text Transcribe Endpoint for Voice Assistance in Chatbot.
     */
    @PostMapping("/transcribe")
    public ResponseEntity<Map<String, Object>> transcribe(@RequestBody Map<String, String> body) {
        String audio = body.get("audio");
        String language = body.get("language");
        Map<String, Object> result = aiService.transcribeAudio(audio, language);
        return ResponseEntity.ok(result);
    }
}
