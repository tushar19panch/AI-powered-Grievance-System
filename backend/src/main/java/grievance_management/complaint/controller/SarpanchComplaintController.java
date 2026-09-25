package grievance_management.complaint.controller;

import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.dto.StatusHistoryResponse;
import grievance_management.complaint.dto.StatusUpdateRequest;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.entity.StatusHistory;
import grievance_management.complaint.repository.StatusHistoryRepository;
import grievance_management.complaint.service.ComplaintService;
import grievance_management.notification.service.NotificationService;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sarpanch/complaints")
public class SarpanchComplaintController {

    private final ComplaintService complaintService;
    private final UserRepository userRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final NotificationService notificationService;

    public SarpanchComplaintController(
            ComplaintService complaintService,
            UserRepository userRepository,
            StatusHistoryRepository statusHistoryRepository,
            NotificationService notificationService) {

        this.complaintService = complaintService;
        this.userRepository = userRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.notificationService = notificationService;
    }

    // =========================================================
    // GET ALL COMPLAINTS FOR SARPANCH'S VILLAGE
    // =========================================================

    @GetMapping
    public ResponseEntity<List<ComplaintResponse>> getComplaints(
            Authentication authentication) {

        User sarpanch = getSarpanch(authentication);

        if (sarpanch.getVillage() == null) {
            throw new RuntimeException(
                    "Sarpanch is not assigned to a village");
        }

        List<ComplaintResponse> complaints =
                complaintService.getComplaintsByVillage(
                        sarpanch.getVillage().getId()
                );

        return ResponseEntity.ok(complaints);
    }

    // =========================================================
    // GET SINGLE COMPLAINT
    // =========================================================

    @GetMapping("/{complaintId}")
    public ResponseEntity<ComplaintResponse> getComplaint(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User sarpanch = getSarpanch(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkVillageAccess(sarpanch, complaint);

        return ResponseEntity.ok(
                complaintService.convertToResponse(complaint)
        );
    }

    // =========================================================
    // UPDATE COMPLAINT STATUS
    // =========================================================

    @PutMapping("/{complaintId}/status")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long complaintId,
            @Valid @RequestBody StatusUpdateRequest request,
            Authentication authentication) {

        User sarpanch = getSarpanch(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkVillageAccess(sarpanch, complaint);

        ComplaintStatus oldStatus =
                complaint.getStatus();

        ComplaintStatus newStatus =
                request.getStatus();

        if (newStatus == null) {
            throw new RuntimeException(
                    "Status is required");
        }

        // Prevent unnecessary status update
        if (oldStatus == newStatus) {
            throw new RuntimeException(
                    "Complaint is already in " + newStatus + " status");
        }

        // -----------------------------------------------------
        // Update status
        // -----------------------------------------------------

        complaint.setStatus(newStatus);

        Complaint updatedComplaint =
                complaintService.saveComplaint(complaint);

        // -----------------------------------------------------
        // Save status history
        // -----------------------------------------------------

        StatusHistory history =
                StatusHistory.builder()
                        .complaint(updatedComplaint)
                        .changedBy(sarpanch)
                        .oldStatus(oldStatus)
                        .newStatus(newStatus)
                        .remarks(request.getRemarks())
                        .build();

        statusHistoryRepository.save(history);

        // -----------------------------------------------------
        // Notify citizen
        // -----------------------------------------------------

        notificationService.createStatusNotification(
                updatedComplaint,
                newStatus
        );

        return ResponseEntity.ok(
                complaintService.convertToResponse(
                        updatedComplaint
                )
        );
    }

    // =========================================================
    // GET STATUS HISTORY
    // =========================================================

    @GetMapping("/{complaintId}/history")
    public ResponseEntity<List<StatusHistoryResponse>> getHistory(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User sarpanch = getSarpanch(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkVillageAccess(sarpanch, complaint);

        List<StatusHistoryResponse> history =
                statusHistoryRepository
                        .findByComplaintIdOrderByCreatedAtAsc(
                                complaintId
                        )
                        .stream()
                        .map(historyItem ->
                                new StatusHistoryResponse(
                                        historyItem.getId(),
                                        complaintId,
                                        historyItem
                                                .getChangedBy()
                                                .getName(),
                                        historyItem
                                                .getChangedBy()
                                                .getRole()
                                                .name(),
                                        historyItem.getOldStatus(),
                                        historyItem.getNewStatus(),
                                        historyItem.getRemarks(),
                                        historyItem.getCreatedAt()
                                )
                        )
                        .toList();

        return ResponseEntity.ok(history);
    }

    // =========================================================
    // FIND SARPANCH FROM JWT
    // =========================================================

    private User getSarpanch(
            Authentication authentication) {

        return userRepository
                .findByMobileNumber(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Sarpanch not found"));
    }

    // =========================================================
    // CHECK VILLAGE ACCESS
    // =========================================================

    private void checkVillageAccess(
            User sarpanch,
            Complaint complaint) {

        if (sarpanch.getVillage() == null) {
            throw new RuntimeException(
                    "Sarpanch is not assigned to a village");
        }

        if (complaint.getVillage() == null) {
            throw new RuntimeException(
                    "Complaint is not assigned to a village");
        }

        if (!sarpanch.getVillage().getId()
                .equals(complaint.getVillage().getId())) {

            throw new RuntimeException(
                    "You cannot access complaints from another village");
        }
    }
}