package grievance_management.notification.controller;

import grievance_management.notification.dto.NotificationResponse;
import grievance_management.notification.service.NotificationService;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/notifications", "/api/citizen/notifications", "/api/sarpanch/notifications", "/api/secretary/notifications"})
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(
            NotificationService notificationService,
            UserRepository userRepository) {

        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>>
    getNotifications(Authentication authentication) {

        String identifier = authentication.getName();

        User user = userRepository
                .findByMobileNumber(identifier)
                .or(() -> userRepository.findByOfficialId(identifier))
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found"
                        )
                );

        List<NotificationResponse> notifications =
                notificationService
                        .getUserNotifications(user.getId());

        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<String> markAsRead(
            @PathVariable Long notificationId,
            Authentication authentication) {

        String identifier = authentication.getName();

        User user = userRepository
                .findByMobileNumber(identifier)
                .or(() -> userRepository.findByOfficialId(identifier))
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found"
                        )
                );

        notificationService.markAsRead(
                notificationId,
                user.getId()
        );

        return ResponseEntity.ok(
                "Notification marked as read"
        );
    }
}