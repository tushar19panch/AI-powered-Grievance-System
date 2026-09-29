package grievance_management.complaint.dto;

import grievance_management.complaint.entity.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintResponse {

    private Long id;

    private String problemType;

    private String category;

    private String priority;

    private String department;

    private String sentiment;

    private LocalDate deadline;

    private String photo;

    private String imageHash;

    private String classification;

    private String classificationReason;

    private String duplicateOfId;

    private String audioUrl;

    private Double latitude;

    private Double longitude;

    private String villageName;

    private String wardNumber;

    private String location;

    private String description;

    private ComplaintStatus status;

    private String citizenName;

    private String citizenMobile;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}