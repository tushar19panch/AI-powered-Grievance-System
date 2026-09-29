package grievance_management.chat.dto;

import grievance_management.ai.dto.AiAnalysisResult;
import grievance_management.complaint.dto.ComplaintResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageResponse {
    /**
     * Assistant's reply in citizen's chosen language (English, Hindi, or Hinglish)
     */
    private String reply;

    /**
     * Detected intent: SUBMIT_COMPLAINT, TRACK_COMPLAINT, FAQ, ESCALATE, GENERAL_HELP
     */
    private String intent;

    /**
     * Language used: en, hi, hinglish
     */
    private String language;

    /**
     * Indicates if the bot is waiting for user input to complete a slot
     */
    private boolean requiresInput;

    /**
     * Next slot needed (e.g. "complaint_id", "location", "ward", "confirm_submission")
     */
    private String nextMissingField;

    /**
     * Session context preserving slot values across turns
     */
    private Map<String, Object> sessionContext;

    /**
     * Interactive quick reply buttons for the frontend chat UI
     */
    private List<String> quickReplies;

    /**
     * Complaint details if tracked or newly created
     */
    private ComplaintResponse complaintData;

    /**
     * AI predictions (Category, Priority, Sentiment)
     */
    private AiAnalysisResult aiAnalysis;

    /**
     * Status indicator: SUCCESS, WAITING_FOR_INPUT, ERROR
     */
    private String status;
}
