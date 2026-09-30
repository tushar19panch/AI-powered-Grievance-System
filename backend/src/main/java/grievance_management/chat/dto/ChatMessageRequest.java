package grievance_management.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageRequest {
    /**
     * User's natural language input (English, Hindi, or Hinglish)
     */
    private String message;

    /**
     * Optional language preference: "en", "hi", "hinglish" (auto-detected if blank)
     */
    private String language;

    /**
     * Session ID to maintain conversation state across turns
     */
    private String conversationId;

    /**
     * Specific complaint ID if tracking or escalating (e.g. 38, or parsed from message)
     */
    private Long complaintId;

    /**
     * Location / landmark during complaint registration
     */
    private String location;

    /**
     * Ward ID if known
     */
    private Long wardId;

    /**
     * Village ID if known
     */
    private Long villageId;

    /**
     * Optional photo base64
     */
    private String photo;

    /**
     * Optional voice audio base64 for speech transcription
     */
    private String audioBase64;

    /**
     * Multi-step dialog context state (slot filling)
     */
    private Map<String, Object> sessionContext;
}
