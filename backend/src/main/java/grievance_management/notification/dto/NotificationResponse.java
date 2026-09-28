package grievance_management.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private Long id;
    private String message;
    private boolean isRead;
    private LocalDateTime createdAt;
    private Long complaintId;

    public NotificationResponse(Long id, String message, boolean isRead, LocalDateTime createdAt) {
        this.id = id;
        this.message = message;
        this.isRead = isRead;
        this.createdAt = createdAt;
        this.complaintId = null;
    }
}