package grievance_management.complaint.controller;

import grievance_management.complaint.dto.ComplaintRequest;
import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.dto.StatusHistoryResponse;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.entity.StatusHistory;
import grievance_management.complaint.repository.StatusHistoryRepository;
import grievance_management.complaint.service.ComplaintService;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/citizen/complaints")
public class CitizenComplaintController {

    private final ComplaintService complaintService;
    private final UserRepository userRepository;
    private final StatusHistoryRepository statusHistoryRepository;

    public CitizenComplaintController(
            ComplaintService complaintService,
            UserRepository userRepository,
            StatusHistoryRepository statusHistoryRepository) {

        this.complaintService = complaintService;
        this.userRepository = userRepository;
        this.statusHistoryRepository = statusHistoryRepository;
    }

    // =========================================================
    // CREATE COMPLAINT
    // =========================================================

    @PostMapping
    public ResponseEntity<ComplaintResponse> createComplaint(
            @Valid @RequestBody ComplaintRequest request,
            Authentication authentication) {

        ComplaintResponse response =
                complaintService.createComplaint(
                        request,
                        authentication.getName()
                );

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // GET CITIZEN'S COMPLAINTS
    // =========================================================

    @GetMapping
    public ResponseEntity<List<ComplaintResponse>> getComplaints(
            Authentication authentication) {

        return ResponseEntity.ok(
                complaintService.getCitizenComplaints(
                        authentication.getName()
                )
        );
    }

    // =========================================================
    // GET SINGLE COMPLAINT
    // =========================================================

    @GetMapping("/{complaintId}")
    public ResponseEntity<ComplaintResponse> getComplaint(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User citizen = getCitizen(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkCitizenAccess(citizen, complaint);

        return ResponseEntity.ok(
                complaintService.convertToResponse(complaint)
        );
    }

    // =========================================================
    // GET COMPLAINT HISTORY
    // =========================================================

    @GetMapping("/{complaintId}/history")
    public ResponseEntity<List<StatusHistoryResponse>> getHistory(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User citizen = getCitizen(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkCitizenAccess(citizen, complaint);

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
                                        historyItem.getChangedBy().getName(),
                                        historyItem.getChangedBy()
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
    // VERIFY RESOLVED COMPLAINT
    // RESOLVED -> VERIFICATION
    // =========================================================

    @PutMapping("/{complaintId}/verify")
    public ResponseEntity<ComplaintResponse> verifyComplaint(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User citizen = getCitizen(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkCitizenAccess(citizen, complaint);

        if (complaint.getStatus()
                != ComplaintStatus.RESOLVED) {

            throw new RuntimeException(
                    "Only a RESOLVED complaint can be verified");
        }

        ComplaintStatus oldStatus =
                complaint.getStatus();

        complaint.setStatus(
                ComplaintStatus.VERIFICATION
        );

        Complaint updated =
                complaintService.saveComplaint(complaint);

        saveHistory(
                updated,
                citizen,
                oldStatus,
                ComplaintStatus.VERIFICATION,
                "Citizen verified that the complaint has been resolved"
        );

        return ResponseEntity.ok(
                complaintService.convertToResponse(updated)
        );
    }

    // =========================================================
    // CLOSE COMPLAINT
    // VERIFICATION -> CLOSED
    // =========================================================

    @PutMapping("/{complaintId}/close")
    public ResponseEntity<ComplaintResponse> closeComplaint(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User citizen = getCitizen(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkCitizenAccess(citizen, complaint);

        if (complaint.getStatus()
                != ComplaintStatus.VERIFICATION) {

            throw new RuntimeException(
                    "Complaint must be verified before closing");
        }

        ComplaintStatus oldStatus =
                complaint.getStatus();

        complaint.setStatus(
                ComplaintStatus.CLOSED
        );

        Complaint updated =
                complaintService.saveComplaint(complaint);

        saveHistory(
                updated,
                citizen,
                oldStatus,
                ComplaintStatus.CLOSED,
                "Complaint closed by citizen after verification"
        );

        return ResponseEntity.ok(
                complaintService.convertToResponse(updated)
        );
    }

    // =========================================================
    // REOPEN COMPLAINT
    // RESOLVED / VERIFICATION -> REOPENED
    // =========================================================

    @PutMapping("/{complaintId}/reopen")
    public ResponseEntity<ComplaintResponse> reopenComplaint(
            @PathVariable Long complaintId,
            Authentication authentication) {

        User citizen = getCitizen(authentication);

        Complaint complaint =
                complaintService.getComplaint(complaintId);

        checkCitizenAccess(citizen, complaint);

        ComplaintStatus currentStatus =
                complaint.getStatus();

        if (currentStatus != ComplaintStatus.RESOLVED &&
                currentStatus != ComplaintStatus.VERIFICATION) {

            throw new RuntimeException(
                    "Only a RESOLVED or VERIFICATION complaint can be reopened");
        }

        complaint.setStatus(
                ComplaintStatus.REOPENED
        );

        Complaint updated =
                complaintService.saveComplaint(complaint);

        saveHistory(
                updated,
                citizen,
                currentStatus,
                ComplaintStatus.REOPENED,
                "Citizen reopened the complaint because the problem was not fully resolved"
        );

        return ResponseEntity.ok(
                complaintService.convertToResponse(updated)
        );
    }

    // =========================================================
    // FIND CITIZEN FROM JWT
    // =========================================================

    private User getCitizen(
            Authentication authentication) {

        return userRepository
                .findByMobileNumber(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Citizen not found"));
    }

    // =========================================================
    // CHECK COMPLAINT OWNERSHIP
    // =========================================================

    private void checkCitizenAccess(
            User citizen,
            Complaint complaint) {

        if (complaint.getCitizen() == null ||
                !complaint.getCitizen()
                        .getId()
                        .equals(citizen.getId())) {

            throw new RuntimeException(
                    "You cannot access this complaint");
        }
    }

    // =========================================================
    // SAVE STATUS HISTORY
    // =========================================================

    private void saveHistory(
            Complaint complaint,
            User citizen,
            ComplaintStatus oldStatus,
            ComplaintStatus newStatus,
            String remarks) {

        StatusHistory history =
                StatusHistory.builder()
                        .complaint(complaint)
                        .changedBy(citizen)
                        .oldStatus(oldStatus)
                        .newStatus(newStatus)
                        .remarks(remarks)
                        .build();

        statusHistoryRepository.save(history);
    }
}