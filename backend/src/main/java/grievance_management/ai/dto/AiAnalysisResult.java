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
    private List<String> priority_indicators;
    private List<String> sentiment_indicators;
}
