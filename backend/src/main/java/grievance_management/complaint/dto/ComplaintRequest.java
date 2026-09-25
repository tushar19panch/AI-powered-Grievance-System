package grievance_management.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ComplaintRequest {

    private String problemType;

    private String category;

    private String priority;

    private String department;

    private LocalDate deadline;

    private String photo;

    private String audioUrl;

    private Double latitude;

    private Double longitude;

    @NotBlank
    private String location;

    @NotBlank
    private String description;
}