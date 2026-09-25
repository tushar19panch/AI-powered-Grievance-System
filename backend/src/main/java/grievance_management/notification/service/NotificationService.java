package grievance_management.notification.service;

import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.notification.dto.NotificationResponse;
import grievance_management.notification.entity.Notification;
import grievance_management.notification.repository.NotificationRepository;
import grievance_management.user.entity.User;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(
            NotificationRepository notificationRepository) {

        this.notificationRepository = notificationRepository;
    }

    public void createStatusNotification(
            Complaint complaint,
            ComplaintStatus newStatus) {

        User citizen = complaint.getCitizen();

        String message =
                "Your complaint #"
                        + complaint.getId()
                        + " has been marked as "
                        + newStatus.name()
                        + ".";

        Notification notification =
                Notification.builder()
                        .user(citizen)
                        .message(message)
                        .isRead(false)
                        .build();

        notificationRepository.save(notification);
    }

    public List<NotificationResponse> getUserNotifications(
            Long userId) {

        List<Notification> notifications =
                notificationRepository
                        .findByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream()
                .map(notification ->
                        new NotificationResponse(
                                notification.getId(),
                                notification.getMessage(),
                                notification.isRead(),
                                notification.getCreatedAt()
                        )
                )
                .toList();
    }

    public void markAsRead(
            Long notificationId,
            Long userId) {

        Notification notification =
                notificationRepository
                        .findById(notificationId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Notification not found"
                                )
                        );

        if (!notification.getUser()
                .getId()
                .equals(userId)) {

            throw new RuntimeException(
                    "You cannot access another user's notification"
            );
        }

        notification.setRead(true);

        notificationRepository.save(notification);
    }
}