package grievance_management.chat.service;

import grievance_management.ai.dto.AiAnalysisResult;
import grievance_management.ai.service.AiService;
import grievance_management.chat.dto.ChatMessageRequest;
import grievance_management.chat.dto.ChatMessageResponse;
import grievance_management.complaint.dto.ComplaintRequest;
import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.complaint.service.ComplaintService;
import grievance_management.user.entity.Role;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);

    private final ComplaintRepository complaintRepository;
    private final ComplaintService complaintService;
    private final AiService aiService;
    private final UserRepository userRepository;
    private final VillageRepository villageRepository;
    private final WardRepository wardRepository;

    private static final Pattern COMPLAINT_ID_PATTERN = Pattern.compile("(?:#|GRV-?|no\\.?|id:?\\s*)(\\d{1,6})\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern WARD_PATTERN = Pattern.compile("(?:ward|वार्ड)\\s*(?:no\\.?|संख्या|num)?\\s*(\\d{1,3})", Pattern.CASE_INSENSITIVE);

    public ChatbotService(
            ComplaintRepository complaintRepository,
            ComplaintService complaintService,
            AiService aiService,
            UserRepository userRepository,
            VillageRepository villageRepository,
            WardRepository wardRepository) {
        this.complaintRepository = complaintRepository;
        this.complaintService = complaintService;
        this.aiService = aiService;
        this.userRepository = userRepository;
        this.villageRepository = villageRepository;
        this.wardRepository = wardRepository;
    }

    /**
     * Main entry point for processing citizen chat messages.
     */
    @Transactional
    public ChatMessageResponse processMessage(ChatMessageRequest request, String authenticatedUsername) {
        String rawMsg = request.getMessage() != null ? request.getMessage().trim() : "";
        Map<String, Object> session = request.getSessionContext() != null ? new HashMap<>(request.getSessionContext()) : new HashMap<>();

        // Voice audio transcription if audioBase64 is provided
        String transcribedVoice = null;
        if ((rawMsg.isEmpty()) && request.getAudioBase64() != null && !request.getAudioBase64().isBlank()) {
            Map<String, Object> sttResult = aiService.transcribeAudio(request.getAudioBase64(), request.getLanguage());
            if (sttResult != null && sttResult.get("text") != null) {
                transcribedVoice = String.valueOf(sttResult.get("text")).trim();
                if (!transcribedVoice.isEmpty()) {
                    rawMsg = transcribedVoice;
                    request.setMessage(rawMsg);
                }
            }
        }

        // 1. Language detection
        String lang = detectLanguage(rawMsg, request.getLanguage(), session);
        session.put("language", lang);

        // 2. Consult Python NLU / LLM Layer if available
        String activeIntent = (String) session.get("active_intent");
        Map<String, Object> nluResult = aiService.understandChatMessage(rawMsg, activeIntent);

        // 3. Determine Intent with state awareness
        String intent = determineIntent(rawMsg, activeIntent, nluResult);
        log.info("Citizen Chat: rawMsg='{}', detectedIntent='{}', lang='{}', wasVoice={}", rawMsg, intent, lang, (transcribedVoice != null));

        // 4. Dispatch to controlled intent handler
        ChatMessageResponse response = switch (intent) {
            case "SUBMIT_COMPLAINT" -> handleSubmitComplaint(rawMsg, request, session, lang, authenticatedUsername, nluResult);
            case "TRACK_COMPLAINT" -> handleTrackComplaint(rawMsg, request, session, lang, nluResult);
            case "COMPLAINT_STATUS" -> handleComplaintStatusExplanation(rawMsg, session, lang);
            case "HOW_TO_COMPLAIN" -> handleHowToComplain(session, lang);
            case "UPDATE_COMPLAINT" -> handleUpdateComplaint(rawMsg, request, session, lang);
            case "ESCALATE_COMPLAINT", "ESCALATE" -> handleEscalateComplaint(rawMsg, request, session, lang, nluResult);
            case "GENERAL_FAQ", "FAQ" -> handleGeneralFaq(rawMsg, session, lang);
            case "UNKNOWN" -> handleUnknownOrHelp(rawMsg, session, lang);
            default -> handleUnknownOrHelp(rawMsg, session, lang);
        };

        if (transcribedVoice != null && response != null) {
            response.setTranscribedText(transcribedVoice);
        }
        return response;
    }

    // =========================================================================
    // 1. INTENT: SUBMIT_COMPLAINT (Multi-step Slot Filling + Existing AI)
    // =========================================================================
    private ChatMessageResponse handleSubmitComplaint(
            String rawMsg,
            ChatMessageRequest req,
            Map<String, Object> session,
            String lang,
            String authenticatedUsername,
            Map<String, Object> nlu) {

        session.put("active_intent", "SUBMIT_COMPLAINT");
        String cleaned = cleanMessage(rawMsg);
        String step = (String) session.get("submit_step");

        // --- STEP 1: Handle Generic Button / Start Trigger ---
        // If user tapped "📝 File Complaint" or said "I want to file a complaint", do NOT classify these words as a complaint!
        boolean isGeneric = isGenericSubmitTrigger(cleaned) || Boolean.TRUE.equals(nlu.get("is_generic_trigger"));
        String existingDesc = (String) session.get("complaint_description");

        if (isGeneric && (existingDesc == null || existingDesc.isBlank())) {
            session.put("submit_step", "AWAITING_DESCRIPTION");
            String prompt = switch (lang) {
                case "hi" -> "मैं आपकी शिकायत दर्ज करने में मदद करूँगा।\n\nकृपया अपनी समस्या का विवरण बताएं।";
                case "hinglish" -> "Main aapki complaint file karne me madad karunga.\n\nKripya apni problem detail me batayein.";
                default -> "I'm here to help you file a complaint.\n\nPlease describe the problem you are facing.";
            };
            return ChatMessageResponse.builder()
                    .reply(prompt)
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("description")
                    .sessionContext(session)
                    .quickReplies(List.of("Water Supply Issue", "Live Wire Fallen", "Pothole on Main Road", "Garbage Dump"))
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        // --- STEP 2: Collect or Refine Problem Description ---
        String savedDesc = (String) session.get("complaint_description");
        if (savedDesc == null || savedDesc.isBlank()) {
            savedDesc = cleaned;
            session.put("complaint_description", savedDesc);
        } else if ("AWAITING_ACTION_DETAIL".equals(step)) {
            // User is providing missing detail for a previously vague problem
            savedDesc = savedDesc + ": " + cleaned;
            session.put("complaint_description", savedDesc);
        }

        // Check if description is too vague (e.g. "bijli ki problem hai")
        boolean isVague = isVagueComplaint(savedDesc) || Boolean.TRUE.equals(nlu.get("is_vague"));
        if (isVague && !"AWAITING_LOCATION".equals(step) && !"AWAITING_CONFIRMATION".equals(step)) {
            session.put("submit_step", "AWAITING_ACTION_DETAIL");
            String vaguePrompt = switch (lang) {
                case "hi" -> "आपकी समस्या नोट कर ली गई है।\n\nकृपया बताएं कि क्या समस्या हो रही है? (जैसे: 'तार टूटकर गिर गया है', 'ट्रांसफार्मर में स्पार्क है', या 'सप्लाई बंद है')।";
                case "hinglish" -> "What is happening?\n\nKripya batayein kya dikkat ho rahi hai (jaise: 'wire road pe gir gaya', 'spark ho raha hai', ya 'supply band hai').";
                default -> "What is happening?\n\nPlease specify what is happening (e.g., 'live wire fallen on road', 'transformer spark', or 'supply outage').";
            };
            return ChatMessageResponse.builder()
                    .reply(vaguePrompt)
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("action_detail")
                    .sessionContext(session)
                    .quickReplies(List.of("Wire Broken on Road", "Transformer Blown", "Water Pipeline Burst", "Street Light Out"))
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        // --- STEP 3: Run AI Pipeline SILENTLY in the Background ---
        AiAnalysisResult aiResult = aiService.analyzeComplaint(savedDesc);
        session.put("ai_category", aiResult.getCategory());
        session.put("ai_priority", aiResult.getPriority());
        session.put("ai_sentiment", aiResult.getSentiment());
        session.put("ai_department", aiResult.getDepartment());

        // --- STEP 4: Ask Location / Ward Number (Clean Dialogue) ---
        String savedLoc = (String) session.get("complaint_location");
        if (req.getLocation() != null && !req.getLocation().isBlank()) {
            savedLoc = req.getLocation().trim();
            session.put("complaint_location", savedLoc);
        }

        // Try extracting ward or landmark from message
        if (savedLoc == null || savedLoc.isBlank()) {
            String extractedLoc = extractLocation(cleaned);
            if (extractedLoc != null) {
                savedLoc = extractedLoc;
                session.put("complaint_location", savedLoc);
            } else if ("AWAITING_LOCATION".equals(step) && !isAffirmation(cleaned)) {
                savedLoc = cleaned;
                session.put("complaint_location", savedLoc);
            }
        }

        if (savedLoc == null || savedLoc.isBlank()) {
            session.put("submit_step", "AWAITING_LOCATION");
            String locPrompt = switch (lang) {
                case "hi" -> "यह जानकर खेद हुआ कि आप इस समस्या का सामना कर रहे हैं। मैं आपकी शिकायत दर्ज करने में मदद करूँगा।\n\nकृपया अपनी लोकेशन या वार्ड नंबर बताएं।";
                case "hinglish" -> "I'm sorry aapko ye pareshani ho rahi hai. Main aapki complaint file karne me madad karunga.\n\nKripya apni location ya ward number batayein.";
                default -> "I'm sorry you're facing this issue. I'll help you file a complaint.\n\nPlease provide your location or ward number.";
            };
            return ChatMessageResponse.builder()
                    .reply(locPrompt)
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("location")
                    .sessionContext(session)
                    .quickReplies(List.of("Ward 1", "Ward 2", "Ward 3", "Ward 4"))
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        // --- STEP 5: Short, Clean Confirmation Turn ---
        if (isUpdateKeyword(cleaned.toLowerCase())) {
            session.put("submit_step", "AWAITING_DESCRIPTION");
            session.remove("complaint_description");
            session.remove("complaint_location");
            String editPrompt = switch (lang) {
                case "hi" -> "कृपया अपनी समस्या का नया विवरण बताएं:";
                case "hinglish" -> "Kripya apni problem ka naya description batayein:";
                default -> "Please provide the updated description of your problem:";
            };
            return ChatMessageResponse.builder()
                    .reply(editPrompt)
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("description")
                    .sessionContext(session)
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        boolean confirmed = isAffirmation(cleaned) || "CONFIRM_COMPLAINT".equalsIgnoreCase(cleaned) || "Submit Complaint".equalsIgnoreCase(cleaned);
        if (!confirmed && !"AWAITING_CONFIRMATION".equals(step)) {
            session.put("submit_step", "AWAITING_CONFIRMATION");
            String confirmPrompt = switch (lang) {
                case "hi" -> String.format(
                        "धन्यवाद। कृपया शिकायत विवरण की पुष्टि करें:\n\n**%s — %s**\n\nक्या आप इस शिकायत को दर्ज करना चाहते हैं?",
                        savedDesc, savedLoc
                );
                case "hinglish" -> String.format(
                        "Thank you. Kripya complaint details confirm karein:\n\n**%s — %s**\n\nKya aap is complaint ko submit karna chahte hain?",
                        savedDesc, savedLoc
                );
                default -> String.format(
                        "Thank you. Please confirm the complaint details:\n\n**%s — %s**\n\nWould you like to submit this complaint?",
                        savedDesc, savedLoc
                );
            };

            return ChatMessageResponse.builder()
                    .reply(confirmPrompt)
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("confirm")
                    .sessionContext(session)
                    .quickReplies(List.of("✅ Submit Complaint", "✏️ Edit"))
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        // --- STEP 6: Execute Complaint Creation via Spring Boot & MySQL ---
        try {
            String citizenUsername = resolveCitizenUsername(authenticatedUsername, session);
            Long villageId = resolveVillageId(req, session);
            Long wardId = resolveWardId(req, session, savedLoc, villageId);

            ComplaintRequest createReq = new ComplaintRequest();
            createReq.setDescription(savedDesc);
            createReq.setProblemType(aiResult.getCategory());
            createReq.setCategory(aiResult.getCategory());
            createReq.setPriority(aiResult.getPriority());
            createReq.setDepartment(aiResult.getDepartment());
            createReq.setLocation(savedLoc);
            createReq.setPhoto(req.getPhoto());

            ComplaintResponse created = complaintService.createComplaint(createReq, citizenUsername);

            // Clean up session
            session.remove("active_intent");
            session.remove("submit_step");
            session.remove("complaint_description");
            session.remove("complaint_location");

            String successReply = switch (lang) {
                case "hi" -> String.format(
                        "✅ आपकी शिकायत सफलतापूर्वक दर्ज कर ली गई है।\n" +
                        "शिकायत संख्या (Complaint ID): **#%d**\n\n" +
                        "आप इस ID का उपयोग करके कभी भी अपनी शिकायत की स्थिति जांच सकते हैं।",
                        created.getId()
                );
                case "hinglish" -> String.format(
                        "✅ Aapki complaint successfully submit ho gayi hai.\n" +
                        "Complaint ID: **#%d**\n\n" +
                        "Aap is ID ka use karke kisi bhi samay complaint status track kar sakte hain.",
                        created.getId()
                );
                default -> String.format(
                        "✅ Your complaint has been submitted successfully.\n" +
                        "Complaint ID: **#%d**\n\n" +
                        "You can use this ID to track your complaint status.",
                        created.getId()
                );
            };

            return ChatMessageResponse.builder()
                    .reply(successReply)
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(false)
                    .complaintData(created)
                    .sessionContext(session)
                    .quickReplies(List.of("🔍 Track Status (#" + created.getId() + ")", "📝 File Another Complaint", "Main Menu"))
                    .status("SUCCESS")
                    .build();

        } catch (Exception e) {
            log.error("Failed to persist grievance via ComplaintService: {}", e.getMessage(), e);
            session.remove("active_intent");
            session.remove("submit_step");
            return ChatMessageResponse.builder()
                    .reply("Grievance submission encountered an error: " + e.getMessage() + ". Please retry or use the complaint form.")
                    .intent("SUBMIT_COMPLAINT")
                    .language(lang)
                    .requiresInput(false)
                    .sessionContext(session)
                    .quickReplies(List.of("Retry", "Main Menu"))
                    .status("ERROR")
                    .build();
        }
    }

    // =========================================================================
    // 2. INTENT: TRACK_COMPLAINT (Real MySQL Data + Status Explanation)
    // =========================================================================
    private ChatMessageResponse handleTrackComplaint(
            String rawMsg,
            ChatMessageRequest req,
            Map<String, Object> session,
            String lang,
            Map<String, Object> nlu) {

        Long complaintId = req.getComplaintId();
        if (complaintId == null) {
            complaintId = extractComplaintId(rawMsg);
        }
        if (complaintId == null && nlu.get("entities") instanceof Map) {
            Object idObj = ((Map<?, ?>) nlu.get("entities")).get("complaint_id");
            if (idObj instanceof Number) complaintId = ((Number) idObj).longValue();
        }
        if (complaintId == null && session.get("pending_track_id") != null) {
            try {
                complaintId = Long.parseLong(session.get("pending_track_id").toString());
            } catch (Exception ignored) {}
        }

        // If ID missing, ask user for Complaint ID
        if (complaintId == null) {
            session.put("active_intent", "TRACK_COMPLAINT");
            String prompt = switch (lang) {
                case "hi" -> "कृपया अपनी शिकायत संख्या (Complaint ID) दर्ज करें, जैसे: #38 या 40।";
                case "hinglish" -> "Kripya apni Complaint ID enter karein (jaise: #38 ya 40).";
                default -> "Please enter your Complaint ID to track its real-time status (e.g., #38 or 40).";
            };
            return ChatMessageResponse.builder()
                    .reply(prompt)
                    .intent("TRACK_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("complaint_id")
                    .sessionContext(session)
                    .quickReplies(List.of("#38", "#1", "Main Menu"))
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        // Fetch from MySQL Database
        Optional<Complaint> opt = complaintRepository.findById(complaintId);

        // Fallback for Demo Complaint #38 if database was freshly created
        if (opt.isEmpty() && complaintId == 38L) {
            opt = Optional.of(ensureDemoComplaint38());
        }

        session.remove("active_intent");
        session.remove("pending_track_id");

        if (opt.isEmpty()) {
            // Find recent available complaints in database to guide the user
            List<Complaint> recent = complaintRepository.findTop5ByOrderByCreatedAtDesc();
            List<String> suggestedChips = new ArrayList<>();
            for (Complaint rc : recent) {
                suggestedChips.add("#" + rc.getId());
            }
            if (suggestedChips.isEmpty()) {
                suggestedChips.add("#38");
            }
            suggestedChips.add("File Complaint");
            suggestedChips.add("Main Menu");

            String notFound = switch (lang) {
                case "hi" -> String.format(
                        "क्षमा करें, शिकायत संख्या **#%d** हमारे रिकॉर्ड में नहीं मिली।\n\n" +
                        "क्या आप अपने गांव की किसी अन्य शिकायत की स्थिति जांचना चाहते हैं?", complaintId);
                case "hinglish" -> String.format(
                        "Sorry, Complaint **#%d** hamare records me nahi mili.\n\n" +
                        "Kya aap kisi dusri complaint ka status dekhna chahte hain?", complaintId);
                default -> String.format(
                        "Complaint **#%d** was not found in database records.\n\n" +
                        "Would you like to track one of the existing village complaints below?", complaintId);
            };

            return ChatMessageResponse.builder()
                    .reply(notFound)
                    .intent("TRACK_COMPLAINT")
                    .language(lang)
                    .requiresInput(false)
                    .sessionContext(session)
                    .quickReplies(suggestedChips)
                    .status("NOT_FOUND")
                    .build();
        }

        Complaint c = opt.get();
        ComplaintResponse dto = complaintService.convertToResponse(c);
        String reply = formatComplaintStatusReply(c, lang);

        List<String> replies = new ArrayList<>();
        if (c.getStatus() != ComplaintStatus.RESOLVED && c.getStatus() != ComplaintStatus.CLOSED) {
            replies.add("Escalate #" + c.getId());
        }
        replies.add("Status Explanations");
        replies.add("Track Another");
        replies.add("Main Menu");

        return ChatMessageResponse.builder()
                .reply(reply)
                .intent("TRACK_COMPLAINT")
                .language(lang)
                .requiresInput(false)
                .complaintData(dto)
                .sessionContext(session)
                .quickReplies(replies)
                .status("SUCCESS")
                .build();
    }

    // =========================================================================
    // 3. INTENT: COMPLAINT_STATUS (Status Explanations)
    // =========================================================================
    private ChatMessageResponse handleComplaintStatusExplanation(String msg, Map<String, Object> session, String lang) {
        String reply = switch (lang) {
            case "hi" -> """
                    📊 **ग्राम पंचायत शिकायत निवारण स्थितियाँ (Status Guide):**

                    1️⃣ **Submitted (दर्ज):** आपकी शिकायत सफलतापूर्वक दर्ज हो चुकी है और ग्राम सचिव को समीक्षा हेतु आवंटित की जा रही है।
                    2️⃣ **Under Review (समीक्षाधीन):** ग्राम सचिव / वार्ड अधिकारी द्वारा समस्या का भौतिक सत्यापन (site verification) किया जा रहा है।
                    3️⃣ **Action Taken / In Progress (प्रगति पर):** संबंधित फील्ड टीम अथवा मिस्त्री/ठेकेदार द्वारा स्थल पर कार्य प्रारंभ कर दिया गया है।
                    4️⃣ **Resolved (हल हो चुकी):** समस्या का समाधान पूर्ण कर दिया गया है। यदि आप संतुष्ट नहीं हैं, तो 3 दिन के भीतर Reopen कर सकते हैं।
                    5️⃣ **Closed (बंद):** नागरिक सत्यापन के पश्चात शिकायत को आधिकारिक रूप से बंद कर दिया गया है।
                    ⚡ **Escalated (उच्चाधिकारी को प्रेषित):** मानक SLA समयावधि से अधिक विलंब होने पर शिकायत उच्चाधिकारी (BDO / DM) को भेज दी गई है।
                    """;
            case "hinglish" -> """
                    📊 **Grievance Status Explanations:**

                    1️⃣ **Submitted:** Complaint register ho chuki hai aur Gram Sachiv ko assign ki ja rahi hai.
                    2️⃣ **Under Review:** Panchayat Secretary / Ward Member ground par problem verify kar rahe hain.
                    3️⃣ **Action Taken / In Progress:** Maintenance field team site par repair/solution work kar rahi hai.
                    4️⃣ **Resolved:** Problem solve ho chuki hai. Agar issue abhi bhi hai toh 3 din me Reopen kar sakte hain.
                    5️⃣ **Closed:** Citizen confirmation ke baad case officially close ho chuka hai.
                    ⚡ **Escalated:** SLA cross hone par complaint senior authority (BDO/DM) ko forward ho chuki hai.
                    """;
            default -> """
                    📊 **Complaint Status Explanations:**

                    1️⃣ **Submitted:** Grievance has been logged and queued for officer assignment.
                    2️⃣ **Under Review:** Gram Sachiv or ward officer is conducting on-site inspection.
                    3️⃣ **Action Taken / In Progress:** Field maintenance crew has been dispatched and work is underway.
                    4️⃣ **Resolved:** Work completed. Citizen can reopen within 3 days if unsatisfied.
                    5️⃣ **Closed:** Grievance officially verified and closed.
                    ⚡ **Escalated:** Transferred to supervisory level (BDO/DM) due to SLA breach.
                    """;
        };

        return ChatMessageResponse.builder()
                .reply(reply)
                .intent("COMPLAINT_STATUS")
                .language(lang)
                .requiresInput(false)
                .sessionContext(session)
                .quickReplies(List.of("🔍 Track Status (#38)", "📝 File Complaint", "Main Menu"))
                .status("SUCCESS")
                .build();
    }

    // =========================================================================
    // 4. INTENT: HOW_TO_COMPLAIN
    // =========================================================================
    private ChatMessageResponse handleHowToComplain(Map<String, Object> session, String lang) {
        String reply = switch (lang) {
            case "hi" -> """
                    📝 **शिकायत दर्ज करने की प्रक्रिया (How to File Complaint):**

                    1. **ग्राम मित्र AI चैटबॉट द्वारा:** 'नई शिकायत' बोलें या लिखें। चैटबॉट आपसे समस्या और स्थान पूछकर शिकायत दर्ज कर देगा।
                    2. **मोबाइल ऐप / वेब पोर्टल:** 'Report a Problem' बटन दबाकर सीधे फोटो और विवरण अपलोड करें।
                    3. **ग्राम पंचायत कार्यालय:** पंचायत भवन में ग्राम सचिव से संपर्क कर लिखित शिकायत दर्ज कराएं।

                    दर्ज होने के तुरंत बाद आपको एक **#GRV-ID** (जैसे: #38) प्राप्त होगी जिससे आप कभी भी स्थिति ट्रैक कर सकते हैं।
                    """;
            case "hinglish" -> """
                    📝 **How to File a Complaint:**

                    1. **Gram Mitra Chatbot:** 'File Complaint' likhein ya bole. Bot aapse problem aur location pooch kar complaint bana dega.
                    2. **Mobile App / Web:** 'Report Problem' button dabayein, photo attach karein aur submit karein.
                    3. **Panchayat Office:** Directly Gram Sachiv se milkar written complaint register karein.

                    Submit hote hi aapko SMS aur dashboard par Complaint ID (#38) mil jayegi.
                    """;
            default -> """
                    📝 **How to File a Grievance:**

                    1. **Via Gram Mitra Assistant:** Simply text or speak your problem in Hindi/English. The bot will collect details and submit.
                    2. **Via Mobile App / Web:** Tap 'Report a Problem' to attach a live photo and description.
                    3. **Via Panchayat Office:** Submit directly to the Panchayat Secretary.

                    You will receive a unique tracking ID (e.g. #38) immediately upon submission.
                    """;
        };

        return ChatMessageResponse.builder()
                .reply(reply)
                .intent("HOW_TO_COMPLAIN")
                .language(lang)
                .requiresInput(false)
                .sessionContext(session)
                .quickReplies(List.of("📝 Start Complaint Now", "🔍 Track Status (#38)", "Main Menu"))
                .status("SUCCESS")
                .build();
    }

    // =========================================================================
    // 5. INTENT: UPDATE_COMPLAINT
    // =========================================================================
    private ChatMessageResponse handleUpdateComplaint(
            String msg,
            ChatMessageRequest req,
            Map<String, Object> session,
            String lang) {

        String prompt = switch (lang) {
            case "hi" -> "कृपया वह नई जानकारी बताएं जो आप अपनी शिकायत में जोड़ना या बदलना चाहते हैं (जैसे: नया स्थान, वार्ड संख्या या अतिरिक्त विवरण)।";
            case "hinglish" -> "Kripya updated details batayein jo aap complaint me add karna chahte hain (jaise new location ya description).";
            default -> "Please provide the updated details you would like to add (e.g. new location or updated problem description).";
        };

        session.put("active_intent", "SUBMIT_COMPLAINT");
        session.put("submit_step", "AWAITING_LOCATION");

        return ChatMessageResponse.builder()
                .reply(prompt)
                .intent("UPDATE_COMPLAINT")
                .language(lang)
                .requiresInput(true)
                .nextMissingField("location")
                .sessionContext(session)
                .quickReplies(List.of("Ward No. 1", "Ward No. 2", "Ward No. 3", "Cancel"))
                .status("WAITING_FOR_INPUT")
                .build();
    }

    // =========================================================================
    // 6. INTENT: ESCALATE_COMPLAINT (Backend Rules Enforced)
    // =========================================================================
    private ChatMessageResponse handleEscalateComplaint(
            String rawMsg,
            ChatMessageRequest req,
            Map<String, Object> session,
            String lang,
            Map<String, Object> nlu) {

        Long complaintId = req.getComplaintId();
        if (complaintId == null) {
            complaintId = extractComplaintId(rawMsg);
        }
        if (complaintId == null && nlu.get("entities") instanceof Map) {
            Object idObj = ((Map<?, ?>) nlu.get("entities")).get("complaint_id");
            if (idObj instanceof Number) complaintId = ((Number) idObj).longValue();
        }

        if (complaintId == null) {
            session.put("active_intent", "ESCALATE_COMPLAINT");
            String prompt = switch (lang) {
                case "hi" -> "कृपया वह शिकायत संख्या (ID) बताएं जिसे आप एस्केलेट (उच्चाधिकारी को प्रेषित) करना चाहते हैं (जैसे: #38)।";
                case "hinglish" -> "Kripya complaint ID batayein jise aap escalate karna chahte hain (jaise: #38).";
                default -> "Please provide the Complaint ID you wish to escalate (e.g., #38).";
            };
            return ChatMessageResponse.builder()
                    .reply(prompt)
                    .intent("ESCALATE_COMPLAINT")
                    .language(lang)
                    .requiresInput(true)
                    .nextMissingField("complaint_id")
                    .sessionContext(session)
                    .quickReplies(List.of("#38", "#1", "Cancel"))
                    .status("WAITING_FOR_INPUT")
                    .build();
        }

        session.remove("active_intent");
        Optional<Complaint> opt = complaintRepository.findById(complaintId);
        if (opt.isEmpty() && complaintId == 38L) {
            opt = Optional.of(ensureDemoComplaint38());
        }

        if (opt.isEmpty()) {
            return ChatMessageResponse.builder()
                    .reply("Complaint #" + complaintId + " not found in records.")
                    .intent("ESCALATE_COMPLAINT")
                    .language(lang)
                    .status("NOT_FOUND")
                    .build();
        }

        Complaint c = opt.get();
        if (c.getStatus() == ComplaintStatus.RESOLVED || c.getStatus() == ComplaintStatus.CLOSED) {
            String resReply = switch (lang) {
                case "hi" -> String.format("शिकायत #%d पहले ही हल (%s) हो चुकी है। यदि समस्या अभी भी है, तो आप नई शिकायत दर्ज कर सकते हैं।", complaintId, c.getStatus());
                case "hinglish" -> String.format("Complaint #%d already %s ho chuki hai. Agar problem abhi bhi hai toh new complaint file karein.", complaintId, c.getStatus());
                default -> String.format("Complaint #%d is already marked as %s. If unresolved, please submit a new grievance.", complaintId, c.getStatus());
            };
            return ChatMessageResponse.builder()
                    .reply(resReply)
                    .intent("ESCALATE_COMPLAINT")
                    .language(lang)
                    .requiresInput(false)
                    .sessionContext(session)
                    .quickReplies(List.of("File New Complaint", "Track Status", "Main Menu"))
                    .status("SUCCESS")
                    .build();
        }

        // Backend Rules Check for Escalation Eligibility
        long daysPending = 0;
        if (c.getCreatedAt() != null) {
            daysPending = ChronoUnit.DAYS.between(c.getCreatedAt().toLocalDate(), LocalDate.now());
        }
        boolean isOverdue = false;
        if (c.getDeadline() != null) {
            isOverdue = LocalDate.now().isAfter(c.getDeadline());
        } else if (daysPending >= 2) {
            isOverdue = true;
        }

        String reply;
        if (isOverdue || c.getStatus() == ComplaintStatus.OVERDUE || c.getStatus() == ComplaintStatus.ESCALATED) {
            c.setStatus(ComplaintStatus.ESCALATED);
            complaintRepository.save(c);

            reply = switch (lang) {
                case "hi" -> String.format(
                        "⚡ **शिकायत एस्केलेशन प्रोटोकॉल (Complaint #%d):**\n\n" +
                        "आपकी शिकायत **%s** पिछले **%d दिनों** से लंबित है और मानक SLA समयावधि पार कर चुकी है।\n" +
                        "• **लेवल 1:** ग्राम सचिव एवं वार्ड सदस्य (48 घंटे) — समयावधि समाप्त ⚠️\n" +
                        "• **लेवल 2:** ग्राम प्रधान/सरपंच एवं खंड विकास अधिकारी (BDO) — **एस्केलेशन अलर्ट भेजा गया** 🚨\n" +
                        "• **लेवल 3:** जिला शिकायत निवारण अधिकारी (DM स्तर)\n\n" +
                        "सिस्टम द्वारा स्थिति को **ESCALATED** कर दिया गया है एवं पर्यवेक्षक अधिकारियों को त्वरित फील्ड सत्यापन का निर्देश जारी हो गया है।",
                        complaintId, c.getCategory(), daysPending
                );
                case "hinglish" -> String.format(
                        "⚡ **Escalation Protocol Activated (Complaint #%d):**\n\n" +
                        "Aapki complaint **%s** pichhle **%d dino** se pending hai aur standard SLA cross ho chuka hai.\n" +
                        "• **Level 1:** Gram Sachiv & Ward Member — SLA Elapsed ⚠️\n" +
                        "• **Level 2:** Sarpanch & BDO (Block Development Officer) — **Escalation Alert Sent** 🚨\n" +
                        "• **Level 3:** District Grievance Officer (DM Office)\n\n" +
                        "Complaint status ko **ESCALATED** update kar diya gaya hai.",
                        complaintId, c.getCategory(), daysPending
                );
                default -> String.format(
                        "⚡ **Grievance Escalation Protocol (Complaint #%d):**\n\n" +
                        "Your complaint regarding **%s** has been pending for **%d days** and exceeded the resolution SLA.\n" +
                        "• **Tier 1:** Ward Officer & Panchayat Secretary (48 hrs) — SLA Elapsed ⚠️\n" +
                        "• **Tier 2:** Village Sarpanch & Block Development Officer (BDO) — **Escalated** 🚨\n" +
                        "• **Tier 3:** District Grievance Officer\n\n" +
                        "Status updated to **ESCALATED** with high-priority supervisory alert.",
                        complaintId, c.getCategory(), daysPending
                );
            };
        } else {
            String deadlineStr = c.getDeadline() != null ? c.getDeadline().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "48 घंटे";
            reply = switch (lang) {
                case "hi" -> String.format(
                        "ℹ️ **शिकायत स्थिति जांच (Complaint #%d):**\n\n" +
                        "आपकी शिकायत **%s** दर्ज हुए अभी **%d दिन** हुए हैं और यह अभी सक्रिय समाधान अवधि में है।\n" +
                        "• **अपेक्षित समाधान तिथि (SLA):** %s\n" +
                        "• **वर्तमान स्थिति:** %s (ग्राम सचिव स्तर पर कार्यरत)\n\n" +
                        "यदि %s तक समाधान नहीं होता है, तो सिस्टम स्वतः इसे लेवल-2 (सरपंच / BDO) को एस्केलेट कर देगा।",
                        complaintId, c.getCategory(), daysPending, deadlineStr, c.getStatus(), deadlineStr
                );
                case "hinglish" -> String.format(
                        "ℹ️ **Complaint Status Check (Complaint #%d):**\n\n" +
                        "Aapki complaint **%s** darj hue abhi **%d din** hue hain aur ye resolution SLA ke andar hai.\n" +
                        "• **Expected SLA Deadline:** %s\n" +
                        "• **Current Status:** %s (Working under Gram Sachiv)\n\n" +
                        "Agar %s tak resolve nahi hota toh system ise automatically BDO/Sarpanch ko escalate kar dega.",
                        complaintId, c.getCategory(), daysPending, deadlineStr, c.getStatus(), deadlineStr
                );
                default -> String.format(
                        "ℹ️ **SLA Status Check (Complaint #%d):**\n\n" +
                        "Your complaint regarding **%s** has been open for **%d days** and is currently within the active SLA window.\n" +
                        "• **Target Resolution Date:** %s\n" +
                        "• **Current Status:** %s\n\n" +
                        "If not resolved by %s, it will automatically escalate to Level 2 (Block Development Officer).",
                        complaintId, c.getCategory(), daysPending, deadlineStr, c.getStatus(), deadlineStr
                );
            };
        }

        return ChatMessageResponse.builder()
                .reply(reply)
                .intent("ESCALATE_COMPLAINT")
                .language(lang)
                .requiresInput(false)
                .sessionContext(session)
                .quickReplies(List.of("Track #" + complaintId, "Call Helpline", "Main Menu"))
                .status("SUCCESS")
                .build();
    }

    // =========================================================================
    // 7. INTENT: GENERAL_FAQ
    // =========================================================================
    private ChatMessageResponse handleGeneralFaq(String msg, Map<String, Object> session, String lang) {
        String lower = msg.toLowerCase();
        String reply;

        if (lower.contains("kitne time") || lower.contains("sla") || lower.contains("timeline") || lower.contains("समाधान समय") || lower.contains("समय सीमा")) {
            reply = switch (lang) {
                case "hi" -> """
                        ⏱️ **ग्राम पंचायत नागरिक सेवा गारंटी (SLA समय-सीमा):**

                        • 🔴 **CRITICAL (अति-गंभीर / जानलेवा):** **24 घंटे** (जैसे: बिजली का नंगा तार, पाइपलाइन में दूषित जल)
                        • 🟠 **HIGH (उच्च):** **48 घंटे** (जैसे: मुख्य सड़क बंद, पूरी बस्ती में बिजली/पानी गुल)
                        • 🔵 **MEDIUM (मध्यम):** **7 कार्यदिवस** (जैसे: सामान्य नल लीकेज, सड़क पर गड्ढा)
                        • 🟢 **LOW (सामान्य):** **15 कार्यदिवस** (जैसे: नई नाली का प्रस्ताव, स्ट्रीट लाइट पोल का रंग)

                        समय पर निस्तारण न होने पर शिकायत स्वतः उच्च अधिकारी को एस्केलेट हो जाती है।
                        """;
                case "hinglish" -> """
                        ⏱️ **Resolution Timelines (SLA Standards):**

                        • 🔴 **CRITICAL:** **24 hours** (Live wire on road, contaminated drinking water)
                        • 🟠 **HIGH:** **48 hours** (Main water pipeline broken, transformer burnt)
                        • 🔵 **MEDIUM:** **7 days** (General pothole, drainage choke)
                        • 🟢 **LOW:** **15 days** (Routine maintenance, street light pole repainting)

                        SLA breach hone par complaint automatically Level 2 (BDO/Sarpanch) ko escalate ho jaati hai.
                        """;
                default -> """
                        ⏱️ **Panchayat Resolution SLAs:**

                        • 🔴 **CRITICAL:** **24 hours** (Life hazards, live wire, open manhole)
                        • 🟠 **HIGH:** **48 hours** (Village-wide power/water shutdown)
                        • 🔵 **MEDIUM:** **7 days** (Road potholes, localized pipe leakage)
                        • 🟢 **LOW:** **15 days** (Routine repairs and non-urgent upkeep)
                        """;
            };
        } else if (lower.contains("critical") || lower.contains("priority") || lower.contains("प्राथमिकता")) {
            reply = switch (lang) {
                case "hi" -> """
                        🔴 **प्राथमिकता (Priority) का निर्धारण AI द्वारा कैसे होता है?**

                        • **CRITICAL:** सार्वजनिक सुरक्षा अथवा जीवन को प्रत्यक्ष खतरा होने पर (जैसे: सड़क पर टूटा बिजली का तार, खुला गहरा सीवर)। इस श्रेणी में तुरंत सचिव व सरपंच को SMS अलर्ट भेजा जाता है।
                        • **HIGH:** बड़े स्तर पर जनजीवन प्रभावित होने पर (जैसे: 3+ दिनों से जलापूर्ति ठप)।
                        • **MEDIUM / LOW:** सामान्य दैनंदिन समस्याएं।

                        नागरिक की भावना (क्रोध/उदासी) से प्राथमिकता नहीं बदलती, केवल भौतिक खतरे की गंभीरता से तय होती है।
                        """;
                case "hinglish" -> """
                        🔴 **How AI Determines Priority:**

                        • **CRITICAL:** Life-threatening emergencies (live wires, open sewer manhole). Officers get instant high-priority alerts.
                        • **HIGH:** Major area disruption (drinking water pipeline burst, transformer failure).
                        • **MEDIUM/LOW:** Routine civic maintenance issues.

                        Sentiment does NOT alter priority—only real physical hazard keywords dictate urgency.
                        """;
                default -> """
                        🔴 **Grievance Priority System:**

                        • **CRITICAL:** Life safety emergency (live wire, open deep manhole). Triggers instant supervisor SMS alert.
                        • **HIGH:** High civic disruption requiring 48-hr response.
                        • **MEDIUM / LOW:** Standard maintenance workflows.
                        """;
            };
        } else {
            reply = switch (lang) {
                case "hi" -> """
                        ❓ **ग्राम मित्र नागरिक सहायता केंद्र:**

                        • **शिकायत ID कहाँ मिलेगी?** शिकायत दर्ज होते ही स्क्रीन और आपके मोबाइल नंबर पर SMS द्वारा भेजी जाती है।
                        • **हेल्पलाइन:** आपातकालीन सहायता हेतु 181 (CM हेल्पलाइन) या 112 डायल करें।
                        • **सचिव संपर्क:** आप डैशबोर्ड के 'ग्राम पदाधिकारी' सेक्शन से सीधे कॉल कर सकते हैं।
                        """;
                case "hinglish" -> """
                        ❓ **Gram Mitra Help Desk:**

                        • **Where is Complaint ID?** Sent via SMS and visible on your dashboard upon submission (#GRV-xxx).
                        • **Helpline:** Call 181 (Citizen Helpline) or 112 for emergencies.
                        • **Officials:** Contact numbers for Sarpanch & Secretary are available on the home screen.
                        """;
                default -> """
                        ❓ **Gram Mitra Civic Help:**

                        • **Complaint ID:** Provided immediately after lodging and saved in your history.
                        • **Helpline:** Dial 181 for state citizen support or 112 for police/fire emergencies.
                        """;
            };
        }

        return ChatMessageResponse.builder()
                .reply(reply)
                .intent("GENERAL_FAQ")
                .language(lang)
                .requiresInput(false)
                .sessionContext(session)
                .quickReplies(List.of("📝 File Complaint", "🔍 Track Status (#38)", "Main Menu"))
                .status("SUCCESS")
                .build();
    }

    // =========================================================================
    // 8. INTENT: UNKNOWN / GENERAL_HELP
    // =========================================================================
    private ChatMessageResponse handleUnknownOrHelp(String rawMsg, Map<String, Object> session, String lang) {
        String greeting = switch (lang) {
            case "hi" -> """
                    नमस्ते! 🙏 मैं **ग्राम मित्र**, आपका AI नागरिक सहायक हूँ।

                    मैं आपकी निम्नलिखित कार्यों में सहायता कर सकता हूँ:
                    • 📝 **नई शिकायत दर्ज करें** (बोलकर या लिखकर समस्या बताएं)
                    • 🔍 **शिकायत की स्थिति जांचें** (जैसे: #38)
                    • 📊 **शिकायत स्थितियों का अर्थ जानें** (Under Review, Resolved आदि)
                    • ⏱️ **समाधान समय-सीमा (SLA)**
                    • ⚡ **लंबित शिकायत एस्केलेट करें**

                    आप नीचे दिए गए विकल्पों में से चुन सकते हैं या अपनी बात सीधे टाइप कर सकते हैं।
                    """;
            case "hinglish" -> """
                    Namaste! 🙏 Main **Gram Mitra**, aapka AI Citizen Assistant hoon.

                    Main aapki in cheezon me madad kar sakta hoon:
                    • 📝 **New Complaint Register karein** (bolkar ya likhkar)
                    • 🔍 **Complaint Status Track karein** (jaise: #38)
                    • 📊 **Status ka meaning jaanein** (Under Review, In Progress, etc.)
                    • ⏱️ **Resolution Time (SLA)**
                    • ⚡ **Pending Complaint Escalate karein**

                    Aap direct message type kar sakte hain ya niche buttons use karein.
                    """;
            default -> """
                    Hello! 🙏 I am **Gram Mitra**, your AI Citizen Assistant for village grievances.

                    How can I help you today?
                    • 📝 **File a New Grievance** (speak or type your problem)
                    • 🔍 **Track Complaint Status** (e.g. #38)
                    • 📊 **Understand Complaint Statuses**
                    • ⏱️ **Check Resolution Timelines (SLA)**
                    • ⚡ **Escalate Delayed Grievances**
                    """;
        };

        return ChatMessageResponse.builder()
                .reply(greeting)
                .intent("UNKNOWN")
                .language(lang)
                .requiresInput(false)
                .sessionContext(session)
                .quickReplies(List.of("📝 File Complaint", "🔍 Track Status (#38)", "📊 Status Explanations", "⏱️ Resolution Time (SLA)"))
                .status("SUCCESS")
                .build();
    }

    // =========================================================================
    // HELPER & UTILITY METHODS
    // =========================================================================

    private String determineIntent(String rawMsg, String activeIntent, Map<String, Object> nlu) {
        String cleaned = cleanMessage(rawMsg).toLowerCase().trim();

        // 1. If NLU returned a high-confidence intent and no conflicting active intent
        if (nlu.get("intent") instanceof String nluIntent && !"UNKNOWN".equals(nluIntent)) {
            if (activeIntent == null || activeIntent.isBlank() || isCancelMessage(cleaned)) {
                return nluIntent;
            }
        }

        // 2. Respect Active Slot Filling State
        if ("SUBMIT_COMPLAINT".equalsIgnoreCase(activeIntent)) {
            if (isCancelMessage(cleaned)) return "UNKNOWN";
            if (isUpdateKeyword(cleaned)) return "UPDATE_COMPLAINT";
            return "SUBMIT_COMPLAINT";
        }
        if ("TRACK_COMPLAINT".equalsIgnoreCase(activeIntent)) {
            if (extractComplaintId(rawMsg) != null || cleaned.matches("^\\d+$")) return "TRACK_COMPLAINT";
            if (isCancelMessage(cleaned)) return "UNKNOWN";
        }
        if ("ESCALATE_COMPLAINT".equalsIgnoreCase(activeIntent) || "ESCALATE".equalsIgnoreCase(activeIntent)) {
            if (extractComplaintId(rawMsg) != null || cleaned.matches("^\\d+$")) return "ESCALATE_COMPLAINT";
            if (isCancelMessage(cleaned)) return "UNKNOWN";
        }

        // 3. Status Explanations check
        if (cleaned.contains("status ka matlab") || cleaned.contains("what does status mean") ||
            cleaned.contains("under review") || cleaned.contains("action taken") ||
            cleaned.contains("resolved kya") || cleaned.contains("status meaning") ||
            cleaned.contains("explain status") || cleaned.contains("स्थिति का मतलब")) {
            return "COMPLAINT_STATUS";
        }

        // 4. How to complain check
        if (cleaned.contains("how to complain") || cleaned.contains("complaint kaise") ||
            cleaned.contains("shikayat kaise") || cleaned.contains("how to file") ||
            cleaned.contains("process kya hai") || cleaned.contains("शिकायत कैसे करें")) {
            return "HOW_TO_COMPLAIN";
        }

        // 5. Escalation check
        if (cleaned.contains("escalat") || cleaned.contains("pending") || cleaned.contains("bahut din") ||
            cleaned.contains("bohot din") || cleaned.contains("10 din") || cleaned.contains("delayed") ||
            cleaned.contains("action nahi") || cleaned.contains("sunwai nahi") || cleaned.contains("लंबित") || cleaned.contains("एस्केलेट")) {
            return "ESCALATE_COMPLAINT";
        }

        // 6. Direct Tracking check (#38, Track status, etc.)
        if (extractComplaintId(rawMsg) != null && (cleaned.contains("#") || cleaned.contains("track") || cleaned.contains("status") || cleaned.contains("kya hua") || cleaned.matches("^#?\\d+$"))) {
            return "TRACK_COMPLAINT";
        }
        if (cleaned.contains("track") || cleaned.contains("status") || cleaned.contains("kya hua") || cleaned.contains("स्थिति") || cleaned.contains("ट्रैक")) {
            return "TRACK_COMPLAINT";
        }

        // 7. Update Complaint
        if (isUpdateKeyword(cleaned)) {
            return "UPDATE_COMPLAINT";
        }

        // 8. General FAQ (SLA, priority definition)
        if (cleaned.contains("sla") || cleaned.contains("kitne time") || cleaned.contains("timeline") ||
            cleaned.contains("critical priority") || cleaned.contains("priority kya") || cleaned.contains("समय सीमा") || cleaned.contains("प्राथमिकता")) {
            return "GENERAL_FAQ";
        }

        // 9. Generic File Complaint trigger
        if (isGenericSubmitTrigger(cleaned)) {
            return "SUBMIT_COMPLAINT";
        }

        // 10. Civic Problem Keywords
        if (containsCivicProblem(cleaned)) {
            return "SUBMIT_COMPLAINT";
        }

        return "UNKNOWN";
    }

    private boolean isGenericSubmitTrigger(String cleaned) {
        String lower = cleaned.toLowerCase().trim();
        if (lower.contains("want to file a complaint") || lower.contains("want to submit a complaint") ||
            lower.contains("want to report a problem") || lower.contains("want to register a complaint") ||
            lower.contains("shikayat karni hai") || lower.contains("complaint karni hai") ||
            lower.contains("शिकायत करनी है") || lower.contains("शिकायत दर्ज करनी")) {
            return true;
        }
        List<String> triggers = List.of(
                "file complaint", "file a complaint", "submit complaint", "report problem",
                "report issue", "register complaint", "nayi shikayat", "shikayat darj",
                "shikayat karni hai", "complaint karni hai", "mujhe shikayat karni hai",
                "i want to file a complaint", "i want to submit a complaint",
                "shikayat", "complaint", "शिकायत", "शिकायत दर्ज", "शिकायत दर्ज करें",
                "नई शिकायत", "समस्या दर्ज करें", "रिपोर्ट करें"
        );
        for (String t : triggers) {
            if (lower.equals(t) || lower.equals("new " + t)) return true;
        }
        return false;
    }

    private boolean isVagueComplaint(String text) {
        String lower = text.toLowerCase().trim();
        List<String> vagueKeywords = List.of(
                "bijli ki problem hai", "bijli ka issue hai", "bijli ki dikkat hai",
                "pani ki problem hai", "pani ka issue hai", "pani ki dikkat hai",
                "sadak kharab hai", "road kharab hai", "nali ki dikkat hai", "kachra pada hai",
                "बिजली की समस्या है", "पानी की समस्या है", "सड़क खराब है", "नाली की समस्या है"
        );
        for (String vk : vagueKeywords) {
            if (lower.equals(vk)) return true;
        }
        String[] words = lower.split("\\s+");
        if (words.length <= 4 && (lower.contains("bijli") || lower.contains("pani") || lower.contains("water") || lower.contains("road") || lower.contains("बिजली") || lower.contains("पानी"))) {
            return !lower.contains("gir") && !lower.contains("toot") && !lower.contains("leak") && !lower.contains("overflow") && !lower.contains("cut") && !lower.contains("गिरा") && !lower.contains("टूटा");
        }
        return false;
    }

    private boolean containsCivicProblem(String lower) {
        return lower.contains("pani") || lower.contains("paani") || lower.contains("water") ||
               lower.contains("bijli") || lower.contains("electricity") || lower.contains("wire") ||
               lower.contains("light") || lower.contains("current") || lower.contains("sadak") ||
               lower.contains("road") || lower.contains("pothole") || lower.contains("gaddha") ||
               lower.contains("nali") || lower.contains("naali") || lower.contains("drain") ||
               lower.contains("kachra") || lower.contains("safai") || lower.contains("garbage") ||
               lower.contains("पानी") || lower.contains("बिजली") || lower.contains("सड़क") ||
               lower.contains("नाली") || lower.contains("कचरा");
    }

    private String cleanMessage(String msg) {
        if (msg == null) return "";
        return msg.replaceAll("^[📝🔍⏱️⚡❓✅❌✏️🏛️🚨\\s]+", "").trim();
    }

    private boolean isCancelMessage(String lower) {
        return lower.contains("cancel") || lower.contains("रद्द") || lower.contains("छोड़ो") || lower.contains("exit") || lower.contains("main menu");
    }

    private boolean isUpdateKeyword(String lower) {
        return lower.contains("update") || lower.contains("edit") || lower.contains("change") || lower.contains("badlav") || lower.contains("बदलाव");
    }

    private boolean isAffirmation(String lower) {
        return lower.contains("yes") || lower.contains("ha") || lower.contains("haan") ||
               lower.contains("sahi") || lower.contains("confirm") || lower.contains("theek hai") ||
               lower.contains("हाँ") || lower.contains("पुष्टि") || lower.contains("submit");
    }

    private String detectLanguage(String text, String clientLang, Map<String, Object> session) {
        if (clientLang != null && !clientLang.isBlank() && !clientLang.equals("auto")) {
            return clientLang;
        }
        if (session.get("language") != null) {
            return session.get("language").toString();
        }
        for (char c : text.toCharArray()) {
            if (Character.UnicodeBlock.of(c) == Character.UnicodeBlock.DEVANAGARI) {
                return "hi";
            }
        }
        String lower = text.toLowerCase();
        if (lower.contains("hai") || lower.contains("nahi") || lower.contains("kya") ||
            lower.contains("batao") || lower.contains("kripya") || lower.contains("kaise") ||
            lower.contains("mera") || lower.contains("meri") || lower.contains("gaon") ||
            lower.contains("paani") || lower.contains("pani") || lower.contains("shikayat")) {
            return "hinglish";
        }
        return "en";
    }

    private Long extractComplaintId(String text) {
        if (text == null) return null;
        Matcher m = COMPLAINT_ID_PATTERN.matcher(text);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (Exception ignored) {}
        }
        String trimmed = text.trim();
        if (trimmed.matches("^\\d{1,6}$")) {
            try {
                return Long.parseLong(trimmed);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String extractLocation(String text) {
        Matcher m = WARD_PATTERN.matcher(text);
        if (m.find()) {
            return "Ward " + m.group(1);
        }
        String lower = text.toLowerCase();
        if (lower.contains("main road") || lower.contains("school") || lower.contains("market") || lower.contains("hospital")) {
            return text;
        }
        return null;
    }

    private String formatComplaintStatusReply(Complaint c, String lang) {
        String idStr = String.format("#%d (GRV-%03d)", c.getId(), c.getId());
        String cat = c.getCategory() != null ? c.getCategory() : "General";
        String prio = c.getPriority() != null ? c.getPriority() : "MEDIUM";
        String status = c.getStatus() != null ? c.getStatus().name() : "SUBMITTED";
        String ward = c.getLocation() != null ? c.getLocation() : (c.getWard() != null ? "Ward " + c.getWard().getWardNumber() : "Main Area");
        String created = c.getCreatedAt() != null ? c.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "Recently";
        String deadline = c.getDeadline() != null ? c.getDeadline().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "48 घंटे";
        String officer = "Panchayat Secretary (ग्राम सचिव)";

        String statusExplanation = getStatusExplanationText(c.getStatus(), lang);

        if ("hi".equals(lang)) {
            return String.format(
                    "📄 **शिकायत विवरण (%s)**\n\n" +
                    "• **वर्तमान स्थिति:** %s\n" +
                    "• **स्थिति का अर्थ:** %s\n" +
                    "• **विभाग/कैटेगरी:** %s\n" +
                    "• **प्राथमिकता (Priority):** %s\n" +
                    "• **वार्ड/स्थान:** %s\n" +
                    "• **दर्ज तिथि:** %s\n" +
                    "• **अपेक्षित समाधान तिथि (SLA):** %s\n" +
                    "• **प्रभारी अधिकारी:** %s\n\n" +
                    "यदि इस समस्या के समाधान में अत्यधिक विलंब हो रहा है, तो आप 'Escalate' कर सकते हैं।",
                    idStr, status, statusExplanation, cat, prio, ward, created, deadline, officer
            );
        } else if ("hinglish".equals(lang)) {
            return String.format(
                    "📄 **Complaint Details (%s)**\n\n" +
                    "• **Current Status:** %s\n" +
                    "• **Status Meaning:** %s\n" +
                    "• **Category:** %s\n" +
                    "• **Priority:** %s\n" +
                    "• **Ward/Location:** %s\n" +
                    "• **Registered On:** %s\n" +
                    "• **Target Resolution (SLA):** %s\n" +
                    "• **Assigned Officer:** %s\n\n" +
                    "Agar resolution me delay ho raha hai toh aap 'Escalate' option use kar sakte hain.",
                    idStr, status, statusExplanation, cat, prio, ward, created, deadline, officer
            );
        } else {
            return String.format(
                    "📄 **Grievance Status Report (%s)**\n\n" +
                    "• **Current Status:** %s\n" +
                    "• **Status Meaning:** %s\n" +
                    "• **Department:** %s\n" +
                    "• **Priority:** %s\n" +
                    "• **Location:** %s\n" +
                    "• **Filed Date:** %s\n" +
                    "• **Estimated Resolution (SLA):** %s\n" +
                    "• **Responsible Official:** %s\n\n" +
                    "You may request escalation if resolution has exceeded the expected deadline.",
                    idStr, status, statusExplanation, cat, prio, ward, created, deadline, officer
            );
        }
    }

    private String getStatusExplanationText(ComplaintStatus status, String lang) {
        if (status == null) status = ComplaintStatus.SUBMITTED;
        return switch (status) {
            case SUBMITTED -> "hi".equals(lang) ? "शिकायत दर्ज हो चुकी है और ग्राम सचिव को आवंटित की जा रही है।" : "Grievance registered and queued for officer review.";
            case UNDER_REVIEW -> "hi".equals(lang) ? "ग्राम सचिव/वार्ड अधिकारी द्वारा समस्या का भौतिक सत्यापन किया जा रहा है।" : "Officer is inspecting and verifying the problem details.";
            case ACTION_TAKEN, IN_PROGRESS -> "hi".equals(lang) ? "संबंधित फील्ड टीम/ठेकेदार द्वारा स्थल पर कार्य प्रगति पर है।" : "Maintenance crew has been dispatched and work is underway.";
            case RESOLVED -> "hi".equals(lang) ? "समस्या का समाधान पूर्ण हो चुका है। आप 3 दिन में Reopen कर सकते हैं।" : "Issue resolved on site. Can be reopened within 3 days.";
            case CLOSED -> "hi".equals(lang) ? "नागरिक सत्यापन के पश्चात केस आधिकारिक रूप से बंद किया गया।" : "Case verified by citizen and officially closed.";
            case ESCALATED, OVERDUE -> "hi".equals(lang) ? "SLA समयावधि पार होने के कारण उच्चाधिकारी (BDO/सरपंच) को प्रेषित।" : "Escalated to senior officer (BDO/DM) due to SLA breach.";
            default -> "hi".equals(lang) ? "प्रक्रियाधीन" : "In workflow";
        };
    }

    private Complaint ensureDemoComplaint38() {
        Optional<Complaint> existing = complaintRepository.findById(38L);
        if (existing.isPresent()) return existing.get();

        Village v = villageRepository.findAll().stream().findFirst().orElseGet(() ->
                villageRepository.save(Village.builder().name("Pipariya").district("Hoshangabad").state("Madhya Pradesh").build()));
        Ward w = wardRepository.findByVillageId(v.getId()).stream().findFirst().orElseGet(() ->
                wardRepository.save(Ward.builder().wardNumber("3").village(v).build()));
        User c = userRepository.findAll().stream().findFirst().orElseGet(() ->
                userRepository.save(User.builder().name("Ramesh Patel").mobileNumber("9876543210").password("pass").role(Role.CITIZEN).village(v).ward(w).build()));

        Complaint sample38 = Complaint.builder()
                .id(38L)
                .problemType("Water Supply")
                .category("Water Supply")
                .priority("MEDIUM")
                .department("Water Supply & Sanitation Department")
                .status(ComplaintStatus.IN_PROGRESS)
                .location("Ward 3, Near Primary School")
                .description("Main pipeline broken near primary school, water supply unavailable for 3 days")
                .sentiment("NEGATIVE")
                .createdAt(LocalDateTime.now().minusDays(3))
                .deadline(LocalDate.now().plusDays(2))
                .village(v)
                .ward(w)
                .citizen(c)
                .build();

        try {
            return complaintRepository.save(sample38);
        } catch (Exception e) {
            log.warn("Could not save demo complaint 38: {}", e.getMessage());
            return sample38;
        }
    }

    private String resolveCitizenUsername(String authenticatedUsername, Map<String, Object> session) {
        if (session != null && session.get("citizen_mobile") != null) {
            String mob = session.get("citizen_mobile").toString().trim();
            if (!mob.isBlank()) {
                Optional<User> opt = userRepository.findByMobileNumber(mob);
                if (opt.isPresent()) {
                    return opt.get().getMobileNumber();
                }
                return mob;
            }
        }

        if (authenticatedUsername != null && !authenticatedUsername.isBlank() && !"anonymousUser".equals(authenticatedUsername)) {
            Optional<User> opt = userRepository.findByMobileNumber(authenticatedUsername);
            if (opt.isPresent()) {
                return opt.get().getMobileNumber();
            }
            try {
                Long uid = Long.parseLong(authenticatedUsername);
                Optional<User> byId = userRepository.findById(uid);
                if (byId.isPresent()) {
                    return byId.get().getMobileNumber();
                }
            } catch (Exception ignored) {}
            return authenticatedUsername;
        }

        Optional<User> citizen = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CITIZEN)
                .findFirst();
        if (citizen.isPresent()) {
            return citizen.get().getMobileNumber();
        }

        Optional<User> opt = userRepository.findAll().stream().findFirst();
        return opt.map(User::getMobileNumber).orElse("9876543210");
    }

    private Long resolveVillageId(ChatMessageRequest req, Map<String, Object> session) {
        if (req.getVillageId() != null) return req.getVillageId();
        Optional<Village> v = villageRepository.findAll().stream().findFirst();
        return v.map(Village::getId).orElse(1L);
    }

    private Long resolveWardId(ChatMessageRequest req, Map<String, Object> session, String loc, Long villageId) {
        if (req.getWardId() != null) return req.getWardId();
        if (loc != null) {
            Matcher m = WARD_PATTERN.matcher(loc);
            if (m.find()) {
                String wardNum = m.group(1);
                Optional<Ward> w = wardRepository.findByVillageIdAndWardNumber(villageId, wardNum);
                if (w.isPresent()) return w.get().getId();
            }
        }
        List<Ward> wards = wardRepository.findByVillageId(villageId);
        return !wards.isEmpty() ? wards.get(0).getId() : 1L;
    }
}
