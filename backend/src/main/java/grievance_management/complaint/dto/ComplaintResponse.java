package grievance_management.complaint.dto;

import grievance_management.complaint.entity.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ComplaintResponse {

    private Long id;

    private String problemType;

    private String category;

    private String priority;

    private String department;

    private LocalDate deadline;

    private String photo;

    private String audioUrl;

    private Double latitude;

    private Double longitude;

    private String villageName;

    private String wardNumber;

    private String location;

    private String description;

    private ComplaintStatus status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}