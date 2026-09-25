package grievance_management.complaint.dto;

import grievance_management.complaint.entity.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StatusUpdateRequest {

    @NotNull
    private ComplaintStatus status;

    private String remarks;
}