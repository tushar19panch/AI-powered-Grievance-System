package grievance_management.complaint.controller;

import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.service.ComplaintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    /**
     * Public / General complaints endpoint
     * Enables direct testing in browser: http://localhost:8080/api/complaints
     */
    @GetMapping
    public ResponseEntity<List<ComplaintResponse>> getAllComplaints(
            @RequestParam(required = false) Long villageId) {

        if (villageId != null) {
            return ResponseEntity.ok(complaintService.getComplaintsByVillage(villageId));
        }

        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/{complaintId}")
    public ResponseEntity<ComplaintResponse> getComplaint(
            @PathVariable Long complaintId) {

        return ResponseEntity.ok(
                complaintService.convertToResponse(
                        complaintService.getComplaint(complaintId)
                )
        );
    }
}
