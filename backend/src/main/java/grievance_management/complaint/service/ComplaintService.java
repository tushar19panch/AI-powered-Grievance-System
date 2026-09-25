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

    public ComplaintService(
            ComplaintRepository complaintRepository,
            StatusHistoryRepository statusHistoryRepository,
            UserRepository userRepository,
            VillageRepository villageRepository,
            WardRepository wardRepository) {

        this.complaintRepository = complaintRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.userRepository = userRepository;
        this.villageRepository = villageRepository;
        this.wardRepository = wardRepository;
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
                    .orElseGet(() -> villageRepository.save(
                            Village.builder().name("Main Village").build()
                    ));
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
        // Problem type
        // ---------------------------------------------------------

        String problemType = request.getProblemType();

        if (problemType == null || problemType.isBlank()) {
            problemType = request.getCategory();
        }

        if (problemType == null || problemType.isBlank()) {
            problemType = "Other";
        }

        // ---------------------------------------------------------
        // Create complaint
        // ---------------------------------------------------------

        Complaint complaint = Complaint.builder()
                .problemType(problemType.trim())
                .category(
                        request.getCategory() != null
                                ? request.getCategory().trim()
                                : null
                )
                .priority(
                        request.getPriority() != null
                                ? request.getPriority().trim()
                                : null
                )
                .department(
                        request.getDepartment() != null
                                ? request.getDepartment().trim()
                                : null
                )
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
                .description(request.getDescription().trim())
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

        return new ComplaintResponse(
                complaint.getId(),
                complaint.getProblemType(),
                complaint.getCategory(),
                complaint.getPriority(),
                complaint.getDepartment(),
                complaint.getDeadline(),
                complaint.getPhoto(),
                complaint.getAudioUrl(),
                complaint.getLatitude(),
                complaint.getLongitude(),
                villageName,
                wardNumber,
                complaint.getLocation(),
                complaint.getDescription(),
                complaint.getStatus(),
                complaint.getCreatedAt(),
                complaint.getUpdatedAt()
        );
    }
}