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

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class ComplaintEscalationService {

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
    // CHECK OVERDUE COMPLAINTS
    // Runs every day at 12:05 AM
    // =========================================================

    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void checkOverdueComplaints() {

        List<Complaint> complaints =
                complaintRepository.findAll();

        LocalDate today = LocalDate.now();

        for (Complaint complaint : complaints) {

            if (complaint.getDeadline() == null) {
                continue;
            }

            if (complaint.getStatus()
                    != ComplaintStatus.IN_PROGRESS) {
                continue;
            }

            if (complaint.getDeadline().isBefore(today)) {

                markAsOverdue(complaint);
            }
        }
    }

    // =========================================================
    // MARK COMPLAINT AS OVERDUE
    // =========================================================

    private void markAsOverdue(
            Complaint complaint) {

        ComplaintStatus oldStatus =
                complaint.getStatus();

        complaint.setStatus(
                ComplaintStatus.OVERDUE
        );

        Complaint updated =
                complaintRepository.save(complaint);

        StatusHistory history =
                StatusHistory.builder()
                        .complaint(updated)
                        .changedBy(null)
                        .oldStatus(oldStatus)
                        .newStatus(
                                ComplaintStatus.OVERDUE
                        )
                        .remarks(
                                "Complaint deadline has passed"
                        )
                        .build();

        statusHistoryRepository.save(history);

        notifySarpanch(
                updated,
                "Complaint #" + updated.getId()
                        + " is overdue."
        );
    }

    // =========================================================
    // ESCALATE OVERDUE COMPLAINTS
    // Runs every day at 12:10 AM
    // =========================================================

    @Scheduled(cron = "0 10 0 * * *")
    @Transactional
    public void escalateOverdueComplaints() {

        List<Complaint> complaints =
                complaintRepository.findAll();

        for (Complaint complaint : complaints) {

            if (complaint.getStatus()
                    != ComplaintStatus.OVERDUE) {
                continue;
            }

            escalateComplaint(complaint);
        }
    }

    // =========================================================
    // ESCALATE COMPLAINT
    // =========================================================

    private void escalateComplaint(
            Complaint complaint) {

        ComplaintStatus oldStatus =
                complaint.getStatus();

        complaint.setStatus(
                ComplaintStatus.ESCALATED
        );

        Complaint updated =
                complaintRepository.save(complaint);

        StatusHistory history =
                StatusHistory.builder()
                        .complaint(updated)
                        .changedBy(null)
                        .oldStatus(oldStatus)
                        .newStatus(
                                ComplaintStatus.ESCALATED
                        )
                        .remarks(
                                "Complaint automatically escalated because it remained overdue"
                        )
                        .build();

        statusHistoryRepository.save(history);

        notifySarpanch(
                updated,
                "Complaint #" + updated.getId()
                        + " has been escalated because it is overdue."
        );
    }

    // =========================================================
    // FIND SARPANCH OF COMPLAINT'S VILLAGE
    // =========================================================

    private void notifySarpanch(
            Complaint complaint,
            String message) {

        if (complaint.getVillage() == null) {
            return;
        }

        List<User> users =
                userRepository.findAll();

        for (User user : users) {

            if (user.getRole() != Role.SARPANCH) {
                continue;
            }

            if (user.getVillage() == null) {
                continue;
            }

            if (!user.getVillage().getId()
                    .equals(complaint.getVillage().getId())) {
                continue;
            }

            Notification notification =
                    Notification.builder()
                            .user(user)
                            .message(message)
                            .isRead(false)
                            .build();

            notificationRepository.save(
                    notification
            );
        }
    }
}