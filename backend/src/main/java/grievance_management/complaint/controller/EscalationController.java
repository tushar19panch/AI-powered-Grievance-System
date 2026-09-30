package grievance_management.complaint.controller;

import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.complaint.service.ComplaintEscalationService;
import grievance_management.complaint.service.ComplaintService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/escalation")
@CrossOrigin(origins = "*")
public class EscalationController {

    private final ComplaintEscalationService escalationService;
    private final ComplaintRepository complaintRepository;
    private final ComplaintService complaintService;

    public EscalationController(
            ComplaintEscalationService escalationService,
            ComplaintRepository complaintRepository,
            ComplaintService complaintService) {
        this.escalationService = escalationService;
        this.complaintRepository = complaintRepository;
        this.complaintService = complaintService;
    }

    /**
     * Get 3-Tier Hierarchy Specifications & Realistic Citizen Charter SLAs
     */
    @GetMapping("/hierarchy")
    public ResponseEntity<Map<String, Object>> getHierarchySpecs() {
        Map<String, Object> res = new LinkedHashMap<>();

        List<Map<String, Object>> tiers = new ArrayList<>();

        Map<String, Object> tier1 = new LinkedHashMap<>();
        tier1.put("level", 1);
        tier1.put("name", "Gram Panchayat");
        tier1.put("hindiName", "ग्राम पंचायत स्तर");
        tier1.put("authorities", List.of("SARPANCH", "SECRETARY"));
        tier1.put("slaWindow", Map.of(
                "CRITICAL", "24 Hours (Same Day)",
                "HIGH", "48 Hours (2 Days)",
                "MEDIUM", "4 Days",
                "LOW", "7 Days"
        ));
        tiers.add(tier1);

        Map<String, Object> tier2 = new LinkedHashMap<>();
        tier2.put("level", 2);
        tier2.put("name", "Block Development Office (BDO)");
        tier2.put("hindiName", "प्रखंड विकास अधिकारी (BDO) स्तर");
        tier2.put("authorities", List.of("BLOCK_OFFICER"));
        tier2.put("slaWindow", Map.of(
                "CRITICAL", "+24 Hours extension",
                "HIGH", "+48 Hours extension",
                "MEDIUM", "+3 Days extension",
                "LOW", "+3 Days extension"
        ));
        tiers.add(tier2);

        Map<String, Object> tier3 = new LinkedHashMap<>();
        tier3.put("level", 3);
        tier3.put("name", "District Administration (DM / Zilla Parishad)");
        tier3.put("hindiName", "जिलाधिकारी (DM) / जिला परिषद स्तर");
        tier3.put("authorities", List.of("DISTRICT_OFFICER", "SUPER_ADMIN"));
        tier3.put("slaWindow", Map.of(
                "CRITICAL", "+48 Hours emergency apex window",
                "GENERAL", "+5 Days apex administrative review"
        ));
        tiers.add(tier3);

        res.put("tiers", tiers);
        res.put("totalTiers", 3);
        res.put("activeEscalationEngine", true);

        return ResponseEntity.ok(res);
    }

    /**
     * Run SLA check on demand (useful for testing or automated cron)
     */
    @PostMapping("/run-check")
    public ResponseEntity<Map<String, Object>> triggerSlaCheck() {
        int escalatedCount = escalationService.runEscalationCycle();
        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("escalatedTicketsCount", escalatedCount);
        res.put("message", "SLA escalation cycle executed successfully");
        return ResponseEntity.ok(res);
    }

    /**
     * Manually escalate ticket to the next administrative tier
     */
    @PostMapping("/{id}/escalate")
    public ResponseEntity<ComplaintResponse> manualEscalate(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found: " + id));

        String reason = body != null ? body.get("reason") : "नागरिक या नोडल अधिकारी द्वारा समय सीमा बीतने पर उच्च स्तर पर एस्केलेट किया गया।";
        Complaint updated = escalationService.escalateToNextTier(complaint, reason);

        return ResponseEntity.ok(complaintService.getComplaintById(updated.getId()));
    }

    /**
     * Get complaints at a specific authority tier level (Level 2 for BDO, Level 3 for DM)
     */
    @GetMapping("/tier/{tierLevel}")
    public ResponseEntity<List<ComplaintResponse>> getComplaintsByTier(@PathVariable Integer tierLevel) {
        List<Complaint> list = complaintRepository.findByEscalationLevelAndParentComplaintIdIsNull(tierLevel);
        List<ComplaintResponse> responses = list.stream()
                .map(c -> complaintService.getComplaintById(c.getId()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
}
