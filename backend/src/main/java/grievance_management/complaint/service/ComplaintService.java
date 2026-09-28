package grievance_management.complaint.service;

import grievance_management.complaint.dto.ComplaintRequest;
import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.entity.StatusHistory;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.complaint.repository.StatusHistoryRepository;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final UserRepository userRepository;
    private final VillageRepository villageRepository;
    private final WardRepository wardRepository;
    private final grievance_management.notification.service.NotificationService notificationService;
    private final grievance_management.ai.service.AiService aiService;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            StatusHistoryRepository statusHistoryRepository,
            UserRepository userRepository,
            VillageRepository villageRepository,
            WardRepository wardRepository,
            grievance_management.notification.service.NotificationService notificationService,
            grievance_management.ai.service.AiService aiService) {

        this.complaintRepository = complaintRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.userRepository = userRepository;
        this.villageRepository = villageRepository;
        this.wardRepository = wardRepository;
        this.notificationService = notificationService;
        this.aiService = aiService;
    }

    // =========================================================
    // CITIZEN - CREATE COMPLAINT
    // =========================================================

    public ComplaintResponse createComplaint(
            ComplaintRequest request,
            String mobileNumber) {

        User citizen = userRepository
                .findByMobileNumber(mobileNumber)
                .orElseThrow(() ->
                        new RuntimeException("Citizen not found"));

        Village village = citizen.getVillage();
        if (village == null) {
            village = villageRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new RuntimeException("Village not found. Citizen must belong to a registered village."));
            citizen.setVillage(village);
            userRepository.save(citizen);
        }

        Ward ward = citizen.getWard();
        if (ward == null) {
            final Village finalVillage = village;
            ward = wardRepository.findByVillageId(village.getId()).stream().findFirst()
                    .orElseGet(() -> wardRepository.save(
                            Ward.builder()
                                    .wardNumber("1")
                                    .village(finalVillage)
                                    .build()
                    ));
            citizen.setWard(ward);
            userRepository.save(citizen);
        }

        // ---------------------------------------------------------
        // AI Analysis Pipeline (Category, Dept, Priority, Sentiment)
        // ---------------------------------------------------------
        String descriptionText = request.getDescription() != null ? request.getDescription().trim() : "";
        grievance_management.ai.dto.AiAnalysisResult aiResult = aiService.analyzeComplaint(descriptionText);

        // AI Predictions take priority for automated categorization and routing
        String category = aiResult.getCategory();
        if (category == null || category.isBlank() || category.equalsIgnoreCase("Other")) {
            category = request.getCategory();
        }
        if (category == null || category.isBlank()) {
            category = "Other";
        }

        String problemType = request.getProblemType();
        if (problemType == null || problemType.isBlank() || problemType.equalsIgnoreCase("Other")) {
            problemType = category;
        }

        String department = aiResult.getDepartment();
        if (department == null || department.isBlank() || department.contains("General Grievance")) {
            if (request.getDepartment() != null && !request.getDepartment().isBlank()) {
                department = request.getDepartment();
            }
        }
        if (department == null || department.isBlank()) {
            department = "General Grievance / Administration";
        }

        String priority = aiResult.getPriority();
        if (priority == null || priority.isBlank()) {
            priority = (request.getPriority() != null && !request.getPriority().isBlank()) ? request.getPriority() : "MEDIUM";
        }

        String sentiment = aiResult.getSentiment() != null && !aiResult.getSentiment().isBlank() ? aiResult.getSentiment() : "NEUTRAL";

        // ---------------------------------------------------------
        // Create complaint
        // ---------------------------------------------------------

        Complaint complaint = Complaint.builder()
                .problemType(problemType.trim())
                .category(category != null ? category.trim() : null)
                .priority(priority != null ? priority.trim() : "MEDIUM")
                .department(department != null ? department.trim() : null)
                .sentiment(sentiment.trim())
                .deadline(request.getDeadline())
                .photo(
                        request.getPhoto() != null
                                ? request.getPhoto().trim()
                                : null
                )
                .audioUrl(
                        request.getAudioUrl() != null
                                ? request.getAudioUrl().trim()
                                : null
                )
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .village(citizen.getVillage())
                .ward(citizen.getWard())
                .citizen(citizen)
                .location(request.getLocation().trim())
                .description(descriptionText)
                .status(ComplaintStatus.SUBMITTED)
                .build();

        Complaint savedComplaint =
                complaintRepository.save(complaint);

        // ---------------------------------------------------------
        // Create initial status history
        // ---------------------------------------------------------

        StatusHistory history = StatusHistory.builder()
                .complaint(savedComplaint)
                .changedBy(citizen)
                .oldStatus(ComplaintStatus.SUBMITTED)
                .newStatus(ComplaintStatus.SUBMITTED)
                .remarks("Complaint submitted by citizen")
                .build();

        statusHistoryRepository.save(history);

        // ---------------------------------------------------------
        // Notify Sarpanch and Secretary of the village
        // ---------------------------------------------------------
        try {
            List<User> officials = userRepository.findAll().stream()
                    .filter(u -> (u.getRole() == grievance_management.user.entity.Role.SARPANCH ||
                            u.getRole() == grievance_management.user.entity.Role.SECRETARY)
                            && (u.getVillage() == null || citizen.getVillage() == null ||
                            u.getVillage().getId().equals(citizen.getVillage().getId())))
                    .toList();

            notificationService.notifyOfficialsOnNewComplaint(savedComplaint, officials);
        } catch (Exception e) {
            System.err.println("Failed to send official notifications: " + e.getMessage());
        }

        return convertToResponse(savedComplaint);
    }

    // =========================================================
    // CITIZEN - GET OWN COMPLAINTS
    // =========================================================

    public List<ComplaintResponse> getCitizenComplaints(
            String mobileNumber) {

        User citizen = userRepository
                .findByMobileNumber(mobileNumber)
                .orElseThrow(() ->
                        new RuntimeException("Citizen not found"));

        return complaintRepository
                .findByCitizenId(citizen.getId())
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // =========================================================
    // GET SINGLE COMPLAINT
    // =========================================================

    public Complaint getComplaint(Long complaintId) {

        return complaintRepository
                .findById(complaintId)
                .orElseThrow(() ->
                        new RuntimeException("Complaint not found"));
    }

    // =========================================================
    // SARPANCH - GET ALL COMPLAINTS OF VILLAGE
    // =========================================================

    public List<ComplaintResponse> getComplaintsByVillage(
            Long villageId) {

        return complaintRepository
                .findByVillageId(villageId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // =========================================================
    // SUPER ADMIN / DISTRICT OFFICER - GET ALL COMPLAINTS
    // =========================================================

    public List<ComplaintResponse> getAllComplaints() {
        return complaintRepository
                .findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // =========================================================
    // SARPANCH - SAVE UPDATED COMPLAINT
    // =========================================================

    public Complaint saveComplaint(
            Complaint complaint) {

        return complaintRepository.save(complaint);
    }

    // =========================================================
    // GET COMPLAINT HISTORY
    // =========================================================

    public List<StatusHistory> getComplaintHistory(
            Long complaintId) {

        return statusHistoryRepository
                .findByComplaintIdOrderByCreatedAtAsc(
                        complaintId
                );
    }

    // =========================================================
    // COMMON - CONVERT ENTITY TO RESPONSE
    // =========================================================

    public ComplaintResponse convertToResponse(
            Complaint complaint) {

        String villageName = null;

        if (complaint.getVillage() != null) {
            villageName =
                    complaint.getVillage().getName();
        }

        String wardNumber = null;

        if (complaint.getWard() != null) {
            wardNumber =
                    complaint.getWard().getWardNumber();
        }

        return ComplaintResponse.builder()
                .id(complaint.getId())
                .problemType(complaint.getProblemType())
                .category(complaint.getCategory())
                .priority(complaint.getPriority())
                .department(complaint.getDepartment())
                .sentiment(complaint.getSentiment())
                .deadline(complaint.getDeadline())
                .photo(complaint.getPhoto())
                .audioUrl(complaint.getAudioUrl())
                .latitude(complaint.getLatitude())
                .longitude(complaint.getLongitude())
                .villageName(villageName)
                .wardNumber(wardNumber)
                .location(complaint.getLocation())
                .description(complaint.getDescription())
                .status(complaint.getStatus())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }
}