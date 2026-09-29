package grievance_management.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VillageOfficialsResponse {

    private Long villageId;
    private String villageName;
    private OfficialInfo sarpanch;
    private OfficialInfo secretary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OfficialInfo {
        private String name;
        private String mobile;
        private String officialId;
        private String role;
        private String village;
    }
}
