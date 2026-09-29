package grievance_management.chat;

import grievance_management.ai.dto.AiAnalysisResult;
import grievance_management.ai.service.AiService;
import grievance_management.chat.dto.ChatMessageRequest;
import grievance_management.chat.dto.ChatMessageResponse;
import grievance_management.chat.service.ChatbotService;
import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.complaint.service.ComplaintService;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatbotServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private ComplaintService complaintService;

    @Mock
    private AiService aiService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VillageRepository villageRepository;

    @Mock
    private WardRepository wardRepository;

    private ChatbotService chatbotService;

    @BeforeEach
    void setUp() {
        chatbotService = new ChatbotService(
                complaintRepository,
                complaintService,
                aiService,
                userRepository,
                villageRepository,
                wardRepository
        );
        lenient().when(aiService.understandChatMessage(anyString(), any())).thenReturn(Collections.emptyMap());
    }

    @Test
    @DisplayName("Fix 1: Clicking '📝 File Complaint' does NOT classify itself; prompts for description")
    void testFileComplaintButtonDoesNotClassifyDescription() {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("📝 File Complaint");
        request.setLanguage("en");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("SUBMIT_COMPLAINT", response.getIntent());
        assertEquals("description", response.getNextMissingField());
        assertTrue(response.isRequiresInput());
        assertTrue(response.getReply().toLowerCase().contains("describe the problem") || response.getReply().contains("problem"));
    }

    @Test
    @DisplayName("Fix 2: Citizen enters complaint 'mere gaon mein 5 din se pani nahi aa raha' -> runs AI silently & prompts location")
    void testSubmitComplaintEntersDescriptionAndRunsAi() {
        AiAnalysisResult aiResult = AiAnalysisResult.builder()
                .category("Water Supply")
                .priority("MEDIUM")
                .sentiment("NEGATIVE")
                .department("Water Supply & Sanitation Department")
                .build();

        when(aiService.analyzeComplaint(anyString())).thenReturn(aiResult);

        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("mere gaon mein 5 din se pani nahi aa raha");
        request.setLanguage("hi");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("SUBMIT_COMPLAINT", response.getIntent());
        assertEquals("location", response.getNextMissingField());
        // Verify AI ran silently in background and stored in session context
        assertEquals("Water Supply", response.getSessionContext().get("ai_category"));
        assertEquals("MEDIUM", response.getSessionContext().get("ai_priority"));
        // Citizen should only see empathetic message and location prompt, not raw AI labels
        assertTrue(response.getReply().contains("लोकेशन") || response.getReply().contains("वार्ड"));
        assertFalse(response.getReply().contains("वर्गीकृत"));
    }

    @Test
    @DisplayName("Silent AI Flow: Citizen describes problem -> asks location -> shows clean confirmation -> submits with Complaint ID")
    void testSilentAiComplaintFilingFlow() {
        AiAnalysisResult aiResult = AiAnalysisResult.builder()
                .category("Water Supply")
                .priority("HIGH")
                .sentiment("NEUTRAL")
                .department("Water Supply / PHED")
                .build();
        when(aiService.analyzeComplaint(anyString())).thenReturn(aiResult);

        ComplaintResponse mockCreated = ComplaintResponse.builder()
                .id(38L)
                .category("Water Supply")
                .priority("HIGH")
                .status(ComplaintStatus.SUBMITTED)
                .location("Ward 2")
                .build();
        when(complaintService.createComplaint(any(), any())).thenReturn(mockCreated);

        // Turn 1: Citizen says "There is no supply of water for 5 days."
        ChatMessageRequest turn1 = new ChatMessageRequest();
        turn1.setMessage("There is no supply of water for 5 days.");
        turn1.setLanguage("en");
        ChatMessageResponse res1 = chatbotService.processMessage(turn1, "9876543210");

        assertNotNull(res1);
        assertEquals("location", res1.getNextMissingField());
        assertTrue(res1.getReply().contains("location or ward number"));
        // Ensure no internal AI leaked to citizen
        assertFalse(res1.getReply().contains("Category"));
        assertFalse(res1.getReply().contains("Priority"));

        // Turn 2: Citizen enters "Ward 2"
        ChatMessageRequest turn2 = new ChatMessageRequest();
        turn2.setMessage("Ward 2");
        turn2.setLanguage("en");
        turn2.setSessionContext(res1.getSessionContext());
        ChatMessageResponse res2 = chatbotService.processMessage(turn2, "9876543210");

        assertNotNull(res2);
        assertEquals("confirm", res2.getNextMissingField());
        assertTrue(res2.getReply().contains("Ward 2"));
        assertTrue(res2.getReply().contains("Would you like to submit this complaint?"));
        assertTrue(res2.getQuickReplies().contains("✅ Submit Complaint"));

        // Turn 3: Citizen clicks "✅ Submit Complaint"
        ChatMessageRequest turn3 = new ChatMessageRequest();
        turn3.setMessage("✅ Submit Complaint");
        turn3.setLanguage("en");
        turn3.setSessionContext(res2.getSessionContext());
        ChatMessageResponse res3 = chatbotService.processMessage(turn3, "9876543210");

        assertNotNull(res3);
        assertEquals("SUCCESS", res3.getStatus());
        assertTrue(res3.getReply().contains("Complaint ID: **#38**"));
        assertTrue(res3.getReply().contains("track your complaint status"));
    }

    @Test
    @DisplayName("Fix 3: Missing Information Collection: Vague complaint 'bijli ki problem hai' prompts 'What is happening?'")
    void testVagueComplaintMissingInfoCollection() {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("bijli ki problem hai");
        request.setLanguage("hinglish");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("SUBMIT_COMPLAINT", response.getIntent());
        assertEquals("action_detail", response.getNextMissingField());
        assertTrue(response.isRequiresInput());
        assertTrue(response.getReply().toLowerCase().contains("what is happening") || response.getReply().contains("dikkat"));
    }

    @Test
    @DisplayName("Fix 4: Complaint Tracking: #38 returns actual MySQL complaint details")
    void testTrackComplaintReturnsActualDetails() {
        Complaint mockComplaint = new Complaint();
        mockComplaint.setId(38L);
        mockComplaint.setProblemType("Water Supply");
        mockComplaint.setCategory("Water Supply");
        mockComplaint.setPriority("MEDIUM");
        mockComplaint.setDepartment("Water Supply & Sanitation Department");
        mockComplaint.setStatus(ComplaintStatus.IN_PROGRESS);
        mockComplaint.setLocation("Ward 3, Near Primary School");
        mockComplaint.setDescription("Main pipeline broken near primary school");
        mockComplaint.setCreatedAt(LocalDateTime.now().minusDays(3));

        when(complaintRepository.findById(38L)).thenReturn(Optional.of(mockComplaint));

        ComplaintResponse mockDto = new ComplaintResponse();
        mockDto.setId(38L);
        mockDto.setCategory("Water Supply");
        mockDto.setPriority("MEDIUM");
        mockDto.setStatus(ComplaintStatus.IN_PROGRESS);
        when(complaintService.convertToResponse(any(Complaint.class))).thenReturn(mockDto);

        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("#38");
        request.setLanguage("hi");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("TRACK_COMPLAINT", response.getIntent());
        assertTrue(response.getReply().contains("#38"));
        assertTrue(response.getReply().contains("Water Supply") || response.getReply().contains("जल आपूर्ति"));
        assertTrue(response.getReply().contains("IN_PROGRESS") || response.getReply().contains("प्रगति"));
        assertNotNull(response.getComplaintData());
        assertEquals(38L, response.getComplaintData().getId());
    }

    @Test
    @DisplayName("Fix 5: Status Explanation: Citizen asks 'What does under review mean?' -> explains statuses")
    void testStatusExplanation() {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("What does under review mean?");
        request.setLanguage("en");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("COMPLAINT_STATUS", response.getIntent());
        assertTrue(response.getReply().contains("Under Review"));
        assertTrue(response.getReply().contains("Submitted"));
        assertTrue(response.getReply().contains("Resolved"));
    }

    @Test
    @DisplayName("Fix 6: Escalation: Delayed complaint #38 triggers escalation under backend rules")
    void testEscalationRuleEnforcement() {
        Complaint mockComplaint = new Complaint();
        mockComplaint.setId(38L);
        mockComplaint.setCategory("Water Supply");
        mockComplaint.setPriority("MEDIUM");
        mockComplaint.setStatus(ComplaintStatus.IN_PROGRESS);
        mockComplaint.setCreatedAt(LocalDateTime.now().minusDays(5));

        when(complaintRepository.findById(38L)).thenReturn(Optional.of(mockComplaint));

        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("Meri complaint 10 din se pending hai #38");
        request.setLanguage("hi");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("ESCALATE_COMPLAINT", response.getIntent());
        assertTrue(response.getReply().contains("#38"));
        assertTrue(response.getReply().contains("एस्केलेशन") || response.getReply().contains("ESCALATED"));
    }

    @Test
    @DisplayName("Fix 7: How to Complain: Citizen asks 'How to file a complaint?'")
    void testHowToComplainIntent() {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("How to file a complaint?");
        request.setLanguage("en");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("HOW_TO_COMPLAIN", response.getIntent());
        assertTrue(response.getReply().contains("Gram Mitra") || response.getReply().contains("Grievance"));
    }

    @Test
    @DisplayName("Fix 8: FAQ & SLA Timelines: Citizen asks 'Complaint kitne time mein resolve hogi?'")
    void testGeneralFaqTimeline() {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage("Complaint kitne time mein resolve hogi?");
        request.setLanguage("hi");

        ChatMessageResponse response = chatbotService.processMessage(request, "9876543210");

        assertNotNull(response);
        assertEquals("GENERAL_FAQ", response.getIntent());
        assertTrue(response.getReply().contains("समय-सीमा") || response.getReply().contains("घंटे") || response.getReply().contains("CRITICAL"));
    }
}
