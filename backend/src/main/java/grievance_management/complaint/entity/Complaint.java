package grievance_management.complaint.entity;

import grievance_management.user.entity.User;
import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Frontend category/problem type
    @Column(nullable = false)
    private String problemType;

    private String category;

    private String priority;

    private String department;

    private String sentiment;

    private LocalDate deadline;

    // Photo path/URL or base64 data URI
    @Column(columnDefinition = "LONGTEXT")
    private String photo;

    // Voice recording path/URL or base64
    @Column(columnDefinition = "LONGTEXT")
    private String audioUrl;

    // Perceptual image hash for duplicate/fake detection
    private String imageHash;

    // AI Classification (GENUINE, DUPLICATE, FAKE, MISMATCH_SUSPICIOUS, NEEDS_VERIFICATION)
    private String classification;

    // Reason for AI classification flag
    @Column(length = 1000)
    private String classificationReason;

    // If duplicate, reference ID of original complaint
    private String duplicateOfId;

    // Parent Complaint ID if this ticket is merged into a primary issue
    private Long parentComplaintId;

    // Number of citizens who reported or supported this same issue (Default: 1)
    @Builder.Default
    private Integer supportCount = 1;

    // True if this complaint was merged into a parent issue
    @Builder.Default
    private Boolean isMerged = false;

    private Double latitude;

    private Double longitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "village_id", nullable = false)
    private Village village;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ward_id", nullable = false)
    private Ward ward;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_id", nullable = false)
    private User citizen;

    @Column(nullable = false, length = 500)
    private String location;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 3-Tier Multi-Level Governance Escalation
    // Level 1: Gram Panchayat (Sarpanch / Secretary)
    // Level 2: Block Development Office (BDO / Taluka)
    // Level 3: District Administration (DM / Zilla Parishad)
    @Builder.Default
    private Integer escalationLevel = 1;

    @Builder.Default
    private String currentAuthority = "SARPANCH";

    private LocalDateTime escalatedAt;

    @Column(length = 1000)
    private String escalationReason;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        createdAt = now;
        updatedAt = now;

        if (status == null) {
            status = ComplaintStatus.SUBMITTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}