package grievance_management.complaint.service;

import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.entity.StatusHistory;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.complaint.repository.StatusHistoryRepository;
import grievance_management.notification.entity.Notification;
import grievance_management.notification.repository.NotificationRepository;
import grievance_management.user.entity.Role;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintEscalationService {

    private static final Logger log = LoggerFactory.getLogger(ComplaintEscalationService.class);

    private final ComplaintRepository complaintRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public ComplaintEscalationService(
            ComplaintRepository complaintRepository,
            StatusHistoryRepository statusHistoryRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository) {

        this.complaintRepository = complaintRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    // =========================================================
    // DAILY AUTOMATED CHECK & MULTI-TIER ESCALATION
    // Runs every day at 12:05 AM (and can be triggered on demand)
    // =========================================================
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void checkAndEscalateOverdueComplaints() {
        runEscalationCycle();
    }

    @Transactional
    public int runEscalationCycle() {
        List<Complaint> complaints = complaintRepository.findAll();
        LocalDate today = LocalDate.now();
        int escalatedCount = 0;

        for (Complaint complaint : complaints) {
            // Only active, unresolved master tickets
            if (complaint.getStatus() == ComplaintStatus.RESOLVED ||
                complaint.getStatus() == ComplaintStatus.CLOSED) {
                continue;
            }

            if (complaint.getDeadline() == null) {
                continue;
            }

            // Check if deadline has breached
            if (complaint.getDeadline().isBefore(today)) {
                escalateToNextTier(complaint, null);
                escalatedCount++;
            }
        }

        log.info("SLA Escalation cycle completed. Total tickets escalated: {}", escalatedCount);
        return escalatedCount;
    }

    // =========================================================
    // MULTI-TIER ESCALATION ENGINE
    // Tier 1 (Sarpanch) -> Tier 2 (BDO) -> Tier 3 (District DM)
    // =========================================================
    @Transactional
    public Complaint escalateToNextTier(Complaint complaint, String customReason) {
        int currentLevel = complaint.getEscalationLevel() != null ? complaint.getEscalationLevel() : 1;
        ComplaintStatus oldStatus = complaint.getStatus();
        String priority = complaint.getPriority() != null ? complaint.getPriority().toUpperCase() : "MEDIUM";

        int nextLevel;
        String nextAuthority;
        LocalDate newDeadline;
        String reason;

        if (currentLevel == 1) {
            // Advance from Tier 1 (Gram Panchayat) to Tier 2 (Block BDO)
            nextLevel = 2;
            nextAuthority = "BDO";

            // SLA extension based on citizen charter
            if (priority.contains("CRITICAL") || priority.contains("VERY_HIGH")) {
                newDeadline = LocalDate.now().plusDays(1); // Emergency BDO window: 24h
            } else if (priority.contains("HIGH")) {
                newDeadline = LocalDate.now().plusDays(2); // High BDO window: 48h
            } else {
                newDeadline = LocalDate.now().plusDays(3); // Medium/Low BDO window: 3 days
            }

            reason = customReason != null && !customReason.isBlank()
                    ? customReason
                    : "ग्राम पंचायत (सरपंच/सचिव) स्तर पर तय समय सीमा में समाधान न होने के कारण प्रखंड विकास अधिकारी (BDO) को स्वतः प्रेषित।";

        } else if (currentLevel == 2) {
            // Advance from Tier 2 (BDO) to Tier 3 (District Magistrate / Apex Officer)
            nextLevel = 3;
            nextAuthority = "DISTRICT_OFFICER";

            if (priority.contains("CRITICAL") || priority.contains("VERY_HIGH") || priority.contains("HIGH")) {
                newDeadline = LocalDate.now().plusDays(2); // District Emergency window: 48h
            } else {
                newDeadline = LocalDate.now().plusDays(5); // District General window: 5 days
            }

            reason = customReason != null && !customReason.isBlank()
                    ? customReason
                    : "प्रखंड (BDO) स्तर पर भी समय सीमा समाप्त होने के कारण जिलाधिकारी (DM) / मुख्य विकास अधिकारी को सर्वोच्च समीक्षा हेतु प्रेषित।";

        } else {
            // Already at Apex Tier 3 - Extend final monitoring window
            nextLevel = 3;
            nextAuthority = "DISTRICT_OFFICER";
            newDeadline = LocalDate.now().plusDays(3);
            reason = "जिला स्तर पर समय सीमा का उल्लंघन। प्रशासनिक समीक्षाधीन।";
        }

        // Apply escalation metadata
        complaint.setEscalationLevel(nextLevel);
        complaint.setCurrentAuthority(nextAuthority);
        complaint.setDeadline(newDeadline);
        complaint.setEscalatedAt(LocalDateTime.now());
        complaint.setEscalationReason(reason);
        complaint.setStatus(ComplaintStatus.ESCALATED);

        Complaint updated = complaintRepository.save(complaint);

        // Determine user who caused status transition (cannot be null per database schema)
        User changer = complaint.getCitizen();
        if (changer == null) {
            changer = userRepository.findByRole(Role.SARPANCH).stream().findFirst().orElse(null);
        }
        if (changer == null) {
            changer = userRepository.findAll().stream().findFirst().orElse(null);
        }

        // Record in status history
        StatusHistory history = StatusHistory.builder()
                .complaint(updated)
                .changedBy(changer)
                .oldStatus(oldStatus)
                .newStatus(ComplaintStatus.ESCALATED)
                .remarks("Tier " + nextLevel + " Escalation (" + nextAuthority + "): " + reason)
                .build();
        statusHistoryRepository.save(history);

        // Dispatch targeted notifications
        notifyParties(updated, nextLevel, nextAuthority, reason);

        return updated;
    }

    // =========================================================
    // MULTI-TIER NOTIFICATION ROUTER
    // =========================================================
    private void notifyParties(Complaint complaint, int tier, String authority, String reason) {
        String villageName = complaint.getVillage() != null ? complaint.getVillage().getName() : "Gram Panchayat";
        Long complaintId = complaint.getId();

        // 1. Notify Citizen
        if (complaint.getCitizen() != null) {
            String citizenMsg = "आपकी शिकायत #" + complaintId + " (" + complaint.getCategory() + ") को समय सीमा बीतने पर "
                    + (tier == 2 ? "प्रखंड विकास अधिकारी (BDO)" : "जिलाधिकारी (DM)")
                    + " के पास त्वरित निस्तारण हेतु प्रेषित कर दिया गया है।";
            createNotification(complaint.getCitizen(), citizenMsg);
        }

        // 2. Notify Sarpanch / Secretary (Warning)
        if (complaint.getVillage() != null) {
            List<User> villageOfficials = userRepository.findAll();
            for (User u : villageOfficials) {
                if (u.getVillage() != null && u.getVillage().getId().equals(complaint.getVillage().getId())) {
                    if (u.getRole() == Role.SARPANCH || u.getRole() == Role.SECRETARY) {
                        String warnMsg = "⚠️ चेतावनी: ग्राम " + villageName + " की शिकायत #" + complaintId
                                + " समय सीमा में हल न होने पर " + authority + " को एस्केलेट हो चुकी है।";
                        createNotification(u, warnMsg);
                    }
                }
            }
        }

        // 3. Notify Block / District Officers
        Role targetRole = tier == 2 ? Role.BLOCK_OFFICER : Role.DISTRICT_OFFICER;
        List<User> higherOfficials = userRepository.findByRole(targetRole);
        for (User officer : higherOfficials) {
            String officerMsg = "🚨 नई एस्केलेटेड शिकायत #" + complaintId + " (" + villageName + ") - प्राथमिकता: "
                    + complaint.getPriority() + "। आपके संज्ञान एवं त्वरित कार्रवाई हेतु प्रेषित है।";
            createNotification(officer, officerMsg);
        }
    }

    private void createNotification(User user, String message) {
        try {
            Notification n = Notification.builder()
                    .user(user)
                    .message(message)
                    .isRead(false)
                    .build();
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Could not save escalation notification: {}", e.getMessage());
        }
    }
}