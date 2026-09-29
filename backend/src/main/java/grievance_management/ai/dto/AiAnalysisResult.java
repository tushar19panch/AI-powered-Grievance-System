package grievance_management.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAnalysisResult {
    private String category;
    private String department;
    private String priority;
    private String sentiment;
    private String classification;
    private String image_hash;
    private String duplicate_of_id;
    private Double similarity_score;
    private String classification_reason;
    private List<String> priority_indicators;
    private List<String> sentiment_indicators;
}
