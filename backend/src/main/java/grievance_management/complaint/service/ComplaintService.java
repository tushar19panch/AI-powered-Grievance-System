package grievance_management.complaint.service;

import grievance_management.complaint.dto.ComplaintRequest;
import grievance_management.complaint.dto.ComplaintResponse;
import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.entity.StatusHistory;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.complaint.repository.StatusHistoryRepository;
import grievance_management.user.entity.Role;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ComplaintService {

    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);

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

        User citizen = resolveOrCreateCitizen(mobileNumber);

        Village village = citizen.getVillage();
        if (village == null) {
            village = villageRepository.findAll().stream().findFirst()
                    .orElseGet(() -> villageRepository.save(
                            Village.builder().name("Pipariya").district("Hoshangabad").state("Madhya Pradesh").build()));
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
        // AI Multimodal Analysis (Text + Image Duplicate/Fake Check)
        // ---------------------------------------------------------
        String descriptionText = request.getDescription() != null ? request.getDescription().trim() : "";
        String photoData = request.getPhoto() != null ? request.getPhoto().trim() : null;

        // Fetch existing complaint image hashes for this village to check for duplicates
        List<Map<String, Object>> existingVillageImages = new java.util.ArrayList<>();
        if (village != null && village.getId() != null) {
            try {
                List<Complaint> villageComplaints = complaintRepository.findByVillageId(village.getId());
                for (Complaint c : villageComplaints) {
                    if (c.getImageHash() != null && !c.getImageHash().isBlank()) {
                        Map<String, Object> imgRecord = new HashMap<>();
                        imgRecord.put("complaint_id", String.valueOf(c.getId()));
                        imgRecord.put("image_hash", c.getImageHash());
                        imgRecord.put("category", c.getCategory());
                        existingVillageImages.add(imgRecord);
                    }
                }
            } catch (Exception e) {
                log.warn("Could not retrieve existing village images for duplicate check: {}", e.getMessage());
            }
        }

        grievance_management.ai.dto.AiAnalysisResult aiResult = aiService.analyzeComplaint(descriptionText, photoData, existingVillageImages);

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
        if (priority == null || priority.isBlank() || (priority.equalsIgnoreCase("MEDIUM") && request.getPriority() != null && !request.getPriority().isBlank())) {
            priority = (request.getPriority() != null && !request.getPriority().isBlank()) ? request.getPriority() : priority;
        }
        if (priority == null || priority.isBlank()) {
            priority = "MEDIUM";
        }

        String sentiment = aiResult.getSentiment();
        if (sentiment == null || sentiment.isBlank() || (sentiment.equalsIgnoreCase("NEUTRAL") && request.getSentiment() != null && !request.getSentiment().isBlank())) {
            sentiment = (request.getSentiment() != null && !request.getSentiment().isBlank()) ? request.getSentiment() : sentiment;
        }
        if (sentiment == null || sentiment.isBlank()) {
            sentiment = "NEUTRAL";
        }
        String classification = aiResult.getClassification() != null && !aiResult.getClassification().isBlank() ? aiResult.getClassification() : "GENUINE";
        String classificationReason = aiResult.getClassification_reason();
        String imageHash = aiResult.getImage_hash();
        String duplicateOfId = aiResult.getDuplicate_of_id();

        // ---------------------------------------------------------
        // Immediate Rejection for Fake / Invalid / Mismatched Photos
        // ---------------------------------------------------------
        if ("FAKE".equalsIgnoreCase(classification)) {
            String msg = classificationReason != null && !classificationReason.isBlank()
                    ? classificationReason
                    : "अमान्य फोटो: अपलोड की गई फोटो खाली, काली या अमान्य है। कृपया समस्या स्थल की स्पष्ट फोटो लगाएं।";
            throw new RuntimeException("INVALID_IMAGE: " + msg);
        }
        if ("MISMATCH_SUSPICIOUS".equalsIgnoreCase(classification)) {
            String msg = classificationReason != null && !classificationReason.isBlank()
                    ? classificationReason
                    : "अमान्य फोटो: समस्या स्थल के स्थान पर सेल्फी, स्क्रीनशॉट या असंबंधित फोटो नहीं लगाई जा सकती। कृपया वास्तविक समस्या की फोटो अपलोड करें।";
            throw new RuntimeException("INVALID_IMAGE: " + msg);
        }

        Long parentComplaintId = null;
        boolean isMerged = false;

        // ---------------------------------------------------------
        // Intelligent Duplicate Linking & Priority Escalation
        // ---------------------------------------------------------
        if (duplicateOfId != null && !duplicateOfId.isBlank()) {
            try {
                Long parentId = Long.parseLong(duplicateOfId.trim());
                Optional<Complaint> parentOpt = complaintRepository.findById(parentId);
                if (parentOpt.isPresent()) {
                    Complaint parent = parentOpt.get();
                    // Link to ultimate parent if parent was also merged
                    if (parent.getParentComplaintId() != null) {
                        parentId = parent.getParentComplaintId();
                        parent = complaintRepository.findById(parentId).orElse(parent);
                    }
                    parentComplaintId = parentId;
                    isMerged = true;

                    // Increment support count on parent ticket
                    int currentSupport = parent.getSupportCount() != null ? parent.getSupportCount() : 1;
                    parent.setSupportCount(currentSupport + 1);

                    // Automatic Priority Escalation based on citizen support
                    if (parent.getSupportCount() >= 5) {
                        parent.setPriority("CRITICAL");
                    } else if (parent.getSupportCount() >= 3 && !"CRITICAL".equalsIgnoreCase(parent.getPriority())) {
                        parent.setPriority("HIGH");
                    }

                    complaintRepository.save(parent);

                    // Add history log on parent ticket
                    StatusHistory parentUpdateHistory = StatusHistory.builder()
                            .complaint(parent)
                            .changedBy(citizen)
                            .oldStatus(parent.getStatus())
                            .newStatus(parent.getStatus())
                            .remarks("Issue supported by citizen " + citizen.getName() + " (Total supporters: " + parent.getSupportCount() + ")")
                            .build();
                    statusHistoryRepository.save(parentUpdateHistory);

                    // Notify Sarpanch of heightened priority/support
                    try {
                        List<User> officials = userRepository.findAll().stream()
                                .filter(u -> (u.getRole() == Role.SARPANCH || u.getRole() == Role.SECRETARY)
                                        && (u.getVillage() == null || citizen.getVillage() == null ||
                                        u.getVillage().getId().equals(citizen.getVillage().getId())))
                                .toList();
                        String supportMsg = "🚨 High Priority Alert: Issue #" + parent.getId() + " (" + parent.getProblemType() + ") has now been reported by " + parent.getSupportCount() + " citizens in " + (parent.getWard() != null ? "Ward " + parent.getWard().getWardNumber() : "Village") + ".";
                        for (User official : officials) {
                            notificationService.createNotification(official, supportMsg, parent.getId());
                        }
                    } catch (Exception e) {
                        log.warn("Could not notify officials of escalated support: {}", e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("Error resolving parent complaint for duplicate {}: {}", duplicateOfId, e.getMessage());
            }
        }

        // ---------------------------------------------------------
        // Create complaint
        // ---------------------------------------------------------

        Complaint complaint = Complaint.builder()
                .problemType(problemType.trim())
                .category(category != null ? category.trim() : null)
                .priority(priority != null ? priority.trim() : "MEDIUM")
                .department(department != null ? department.trim() : null)
                .sentiment(sentiment.trim())
                .classification(classification)
                .classificationReason(classificationReason)
                .imageHash(imageHash)
                .duplicateOfId(duplicateOfId)
                .parentComplaintId(parentComplaintId)
                .isMerged(isMerged)
                .supportCount(1)
                .deadline(
                        request.getDeadline() != null
                                ? request.getDeadline()
                                : ("CRITICAL".equalsIgnoreCase(priority) || "VERY_HIGH".equalsIgnoreCase(priority)
                                        ? LocalDate.now().plusDays(1) // 24 Hours Emergency
                                        : "HIGH".equalsIgnoreCase(priority)
                                                ? LocalDate.now().plusDays(2) // 48 Hours
                                                : "MEDIUM".equalsIgnoreCase(priority)
                                                        ? LocalDate.now().plusDays(4) // 4 Days
                                                        : LocalDate.now().plusDays(7)) // 7 Days Low
                )
                .escalationLevel(1)
                .currentAuthority("SARPANCH")
                .photo(photoData)
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

        String initialRemarks = isMerged
                ? "Complaint submitted and automatically merged with primary issue #" + parentComplaintId
                : "Complaint submitted by citizen";

        StatusHistory history = StatusHistory.builder()
                .complaint(savedComplaint)
                .changedBy(citizen)
                .oldStatus(ComplaintStatus.SUBMITTED)
                .newStatus(ComplaintStatus.SUBMITTED)
                .remarks(initialRemarks)
                .build();

        statusHistoryRepository.save(history);

        // ---------------------------------------------------------
        // Notify Sarpanch and Secretary if not a duplicate merge
        // (If merged, Sarpanch already received the consolidated escalation alert)
        // ---------------------------------------------------------
        if (!isMerged) {
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
        }

        return convertToResponse(savedComplaint);
    }

    // =========================================================
    // CITIZEN - GET OWN COMPLAINTS
    // =========================================================

    public List<ComplaintResponse> getCitizenComplaints(
            String mobileNumber) {

        User citizen = resolveOrCreateCitizen(mobileNumber);

        return complaintRepository
                .findByCitizenId(citizen.getId())
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    private User resolveOrCreateCitizen(String mobileNumber) {
        if (mobileNumber != null && !mobileNumber.isBlank() && !"anonymousUser".equals(mobileNumber)) {
            Optional<User> byMobile = userRepository.findByMobileNumber(mobileNumber);
            if (byMobile.isPresent()) {
                return byMobile.get();
            }
            try {
                Long uid = Long.parseLong(mobileNumber);
                Optional<User> byId = userRepository.findById(uid);
                if (byId.isPresent()) {
                    return byId.get();
                }
            } catch (Exception ignored) {}
        }

        // Try finding any existing citizen in the database
        Optional<User> anyCitizen = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CITIZEN)
                .findFirst();
        if (anyCitizen.isPresent()) {
            return anyCitizen.get();
        }

        // If no citizen exists in DB, automatically provision one
        Village village = villageRepository.findAll().stream().findFirst().orElseGet(() ->
                villageRepository.save(Village.builder().name("Pipariya").district("Hoshangabad").state("Madhya Pradesh").build()));
        Ward ward = wardRepository.findByVillageId(village.getId()).stream().findFirst().orElseGet(() ->
                wardRepository.save(Ward.builder().wardNumber("1").village(village).build()));

        String targetMobile = (mobileNumber != null && !mobileNumber.isBlank() && !"anonymousUser".equals(mobileNumber))
                ? mobileNumber : "9876543210";

        return userRepository.save(User.builder()
                .name("Citizen")
                .mobileNumber(targetMobile)
                .password("$2a$10$wKqKzM2y2gqM2h6s8FvEoeG8JkL1u2v3w4x5y6z7a8b9c0d1e2f3g")
                .role(Role.CITIZEN)
                .village(village)
                .ward(ward)
                .build());
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

    public ComplaintResponse getComplaintById(Long complaintId) {
        Complaint c = getComplaint(complaintId);
        return convertToResponse(c);
    }

    // =========================================================
    // SARPANCH - GET ALL CONSOLIDATED COMPLAINTS OF VILLAGE
    // Duplicates are filtered out (merged into parent)
    // =========================================================

    public List<ComplaintResponse> getComplaintsByVillage(
            Long villageId) {

        return complaintRepository
                .findByVillageIdAndParentComplaintIdIsNull(villageId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // =========================================================
    // SUPER ADMIN / DISTRICT OFFICER - GET ALL PRIMARY COMPLAINTS
    // =========================================================

    public List<ComplaintResponse> getAllComplaints() {
        return complaintRepository
                .findByParentComplaintIdIsNull()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // =========================================================
    // SARPANCH - SAVE UPDATED COMPLAINT & CASCADE TO MERGED TICKETS
    // =========================================================

    public Complaint updateComplaintStatusWithCascade(
            Complaint complaint,
            ComplaintStatus newStatus,
            User updatedBy,
            String remarks) {

        ComplaintStatus oldStatus = complaint.getStatus();
        complaint.setStatus(newStatus);
        if (remarks != null && !remarks.isBlank()) {
            complaint.setActionRemarks(remarks);
        }
        if (updatedBy != null) {
            complaint.setResolvedByRole(updatedBy.getRole() != null ? updatedBy.getRole().name() : null);
            complaint.setResolvedByName(updatedBy.getName());
        }
        Complaint savedComplaint = complaintRepository.save(complaint);

        // Create status history for parent ticket
        StatusHistory history = StatusHistory.builder()
                .complaint(savedComplaint)
                .changedBy(updatedBy)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .remarks(remarks)
                .build();
        statusHistoryRepository.save(history);

        // Notify parent ticket citizen
        notificationService.createStatusNotification(savedComplaint, newStatus);

        // Cascade to all merged child tickets
        try {
            List<Complaint> childComplaints = complaintRepository.findByParentComplaintId(savedComplaint.getId());
            for (Complaint child : childComplaints) {
                ComplaintStatus childOldStatus = child.getStatus();
                child.setStatus(newStatus);
                complaintRepository.save(child);

                StatusHistory childHistory = StatusHistory.builder()
                        .complaint(child)
                        .changedBy(updatedBy)
                        .oldStatus(childOldStatus)
                        .newStatus(newStatus)
                        .remarks("Synchronized with primary issue #" + savedComplaint.getId() + (remarks != null ? ": " + remarks : ""))
                        .build();
                statusHistoryRepository.save(childHistory);

                // Send notification to child citizen
                if (child.getCitizen() != null) {
                    String childMsg = "Your issue #" + child.getId() + " (merged with primary issue #" + savedComplaint.getId() + ") is now " + newStatus + ".";
                    notificationService.createNotification(child.getCitizen(), childMsg, child.getId());
                }
            }
        } catch (Exception e) {
            log.warn("Error cascading status update to child complaints: {}", e.getMessage());
        }

        return savedComplaint;
    }

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

        String photoUrl = complaint.getPhoto();

        String citizenName = null;
        String citizenMobile = null;
        if (complaint.getCitizen() != null) {
            citizenName = complaint.getCitizen().getName();
            citizenMobile = complaint.getCitizen().getMobileNumber();
        }

        Long daysRemaining = null;
        if (complaint.getDeadline() != null) {
            daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), complaint.getDeadline());
        }

        return ComplaintResponse.builder()
                .id(complaint.getId())
                .problemType(complaint.getProblemType())
                .category(complaint.getCategory())
                .priority(complaint.getPriority())
                .department(complaint.getDepartment())
                .sentiment(complaint.getSentiment())
                .deadline(complaint.getDeadline())
                .daysRemaining(daysRemaining)
                .escalationLevel(complaint.getEscalationLevel() != null ? complaint.getEscalationLevel() : 1)
                .currentAuthority(complaint.getCurrentAuthority() != null ? complaint.getCurrentAuthority() : "SARPANCH")
                .escalatedAt(complaint.getEscalatedAt())
                .escalationReason(complaint.getEscalationReason())
                .photo(photoUrl)
                .imageHash(complaint.getImageHash())
                .classification(complaint.getClassification())
                .classificationReason(complaint.getClassificationReason())
                .duplicateOfId(complaint.getDuplicateOfId())
                .parentComplaintId(complaint.getParentComplaintId())
                .supportCount(complaint.getSupportCount() != null ? complaint.getSupportCount() : 1)
                .isMerged(complaint.getIsMerged() != null ? complaint.getIsMerged() : false)
                .audioUrl(complaint.getAudioUrl())
                .latitude(complaint.getLatitude())
                .longitude(complaint.getLongitude())
                .villageName(villageName)
                .wardNumber(wardNumber)
                .location(complaint.getLocation())
                .description(complaint.getDescription())
                .status(complaint.getStatus())
                .citizenName(citizenName)
                .citizenMobile(citizenMobile)
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .actionRemarks(complaint.getActionRemarks())
                .resolvedByRole(complaint.getResolvedByRole())
                .resolvedByName(complaint.getResolvedByName())
                .build();
    }

    public String processPhotoUrl(Long complaintId, String photoData) {
        if (photoData == null || photoData.isBlank()) {
            return null;
        }
        if (photoData.startsWith("data:image/") || photoData.length() > 500) {
            try {
                java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads");
                java.nio.file.Files.createDirectories(uploadDir);
                String fileName = "complaint_" + (complaintId != null ? complaintId : java.util.UUID.randomUUID()) + ".jpg";
                java.nio.file.Path target = uploadDir.resolve(fileName);

                String base64Content = photoData;
                int commaIndex = photoData.indexOf(",");
                if (commaIndex != -1) {
                    base64Content = photoData.substring(commaIndex + 1);
                }
                byte[] decoded = java.util.Base64.getDecoder().decode(base64Content.trim());
                java.nio.file.Files.write(target, decoded);
                return "/uploads/" + fileName;
            } catch (Exception e) {
                log.warn("Could not save base64 photo to file: {}", e.getMessage());
                return photoData;
            }
        }
        return photoData;
    }
}