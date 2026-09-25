package grievance_management.complaint.dto;

import grievance_management.complaint.entity.ComplaintStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class StatusHistoryResponse {

    private Long id;

    private Long complaintId;

    private String changedByName;

    private String changedByRole;

    private ComplaintStatus oldStatus;

    private ComplaintStatus newStatus;

    private String remarks;

    private LocalDateTime createdAt;
}