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
        return AiAnalysisResult.builder()
                .category("Other")
                .department("General Grievance / Administration")
                .priority("MEDIUM")
                .sentiment("NEUTRAL")
                .classification("GENUINE")
                .build();
    }
}
