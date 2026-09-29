package grievance_management.ai.service;

import grievance_management.ai.dto.AiAnalysisResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    @Value("${ai.service.url:http://127.0.0.1:5000/analyze}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;

    public AiService() {
        this.restTemplate = new RestTemplate();
    }

    public AiAnalysisResult analyzeComplaint(String description) {
        return analyzeComplaint(description, null, null);
    }

    public AiAnalysisResult analyzeComplaint(String description, String imageBase64, Object existingRecords) {
        if ((description == null || description.trim().isEmpty()) && (imageBase64 == null || imageBase64.trim().isEmpty())) {
            return fallback("No description or image provided");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            Map<String, Object> payload = new HashMap<>();
            if (description != null) {
                payload.put("complaint", description.trim());
            }
            if (imageBase64 != null && !imageBase64.trim().isEmpty()) {
                payload.put("image", imageBase64.trim());
            }
            if (existingRecords != null) {
                payload.put("existing_images", existingRecords);
            }

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

            ResponseEntity<AiAnalysisResult> response = restTemplate.postForEntity(
                    aiServiceUrl,
                    requestEntity,
                    AiAnalysisResult.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                AiAnalysisResult result = response.getBody();
                log.info("AI Analysis success: category={}, dept={}, priority={}, classification={}",
                        result.getCategory(), result.getDepartment(), result.getPriority(), result.getClassification());
                return result;
            }
        } catch (Exception e) {
            log.warn("AI Service connection to [{}] failed: {}. Using fallback prediction.", aiServiceUrl, e.getMessage());
        }

        return fallback(description);
    }

    private AiAnalysisResult fallback(String text) {
        String lower = text != null ? text.toLowerCase().trim() : "";

        // 1. Determine Category & Department
        String category = "Other";
        String department = "General Grievance / Administration";

        if (containsAny(lower, "पानी", "जल", "नल", "हैंडपंप", "पाइप", "टंकी", "बोरवेल", "water", "tap", "pipeline", "leakage", "paani", "pani", "tanker")) {
            category = "Water Supply";
            department = "Water Supply Department";
        } else if (containsAny(lower, "बिजली", "करंट", "तार", "खंभा", "पोल", "ट्रांसफार्मर", "स्ट्रीट लाइट", "बल्ब", "अंधेरा", "electricity", "power", "light", "wire", "voltage", "blackout", "bijli", "shock")) {
            category = "Electricity";
            department = "Electricity Department";
        } else if (containsAny(lower, "सड़क", "मार्ग", "रास्ता", "गड्ढा", "गड्ढे", "डामर", "पुलिया", "road", "pothole", "highway", "street", "sadak", "gaddha")) {
            category = "Roads & Transportation";
            department = "Roads & Transportation Department";
        } else if (containsAny(lower, "नाली", "गंदा पानी", "गटर", "सीवर", "चोक", "drain", "drainage", "sewage", "gutter", "naali", "nali")) {
            category = "Drainage";
            department = "Drainage Department";
        } else if (containsAny(lower, "कचरा", "कूड़ा", "गंदगी", "सफाई", "कूड़ेदान", "झाड़ू", "garbage", "waste", "trash", "cleaning", "kachra", "safai", "dustbin")) {
            category = "Waste Management";
            department = "Waste Management Department";
        } else if (containsAny(lower, "शौचालय", "टॉयलेट", "स्वच्छता", "toilet", "sanitation", "shauchalaya")) {
            category = "Sanitation";
            department = "Sanitation Department";
        } else if (containsAny(lower, "अस्पताल", "दवा", "डॉक्टर", "नर्स", "बीमारी", "इलाज", "hospital", "doctor", "medicine", "health", "clinic", "dawai", "ilaj")) {
            category = "Healthcare";
            department = "Health Department";
        } else if (containsAny(lower, "स्कूल", "विद्यालय", "शिक्षक", "किताब", "मास्टर", "school", "teacher", "education", "student", "shiksha")) {
            category = "Education";
            department = "Education Department";
        } else if (containsAny(lower, "पशु", "कुत्ता", "गाय", "भैंस", "मवेशी", "animal", "dog", "cattle", "cow", "pashu")) {
            category = "Animal & Veterinary";
            department = "Animal & Veterinary Department";
        } else if (containsAny(lower, "राशन", "पेंशन", "कोटा", "ration", "pension", "yojana")) {
            category = "Welfare Services";
            department = "Welfare Services Department";
        }

        // 2. Determine Priority
        String priority = "MEDIUM";
        if (containsAny(lower, "जान का खतरा", "जानलेवा", "करंट", "तार टूटा", "तार गिर", "आग", "शॉर्ट सर्किट", "ब्लास्ट", "खुला मेनहोल", "electrocution", "live wire", "fire", "danger to life", "life threatening", "collapse")) {
            priority = "CRITICAL";
        } else if (containsAny(lower, "आपातकालीन", "अत्यावश्यक", "तुरंत", "खतरा", "दुर्घटना", "गंभीर", "दूषित पानी", "डॉक्टर नहीं", "emergency", "urgent", "immediately", "hazard", "severe", "contaminated")) {
            priority = "HIGH";
        } else if (containsAny(lower, "छोटा", "हल्का", "धीमा", "निवेदन", "minor", "routine", "slow")) {
            priority = "LOW";
        }

        // 3. Determine Sentiment
        String sentiment = "NEUTRAL";
        if (containsAny(lower, "नहीं", "खराब", "समस्या", "परेशान", "गुस्सा", "दुखी", "no", "not", "broken", "worst", "bad", "angry", "poor", "pathetic", "failed")) {
            sentiment = "NEGATIVE";
        } else if (containsAny(lower, "धन्यवाद", "शुक्रिया", "अच्छा", "सफल", "सुधार", "thanks", "thank", "good", "great", "excellent", "resolved")) {
            sentiment = "POSITIVE";
        }

        return AiAnalysisResult.builder()
                .category(category)
                .department(department)
                .priority(priority)
                .sentiment(sentiment)
                .classification("GENUINE")
                .build();
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) return false;
        for (String kw : keywords) {
            if (text.contains(kw.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}
