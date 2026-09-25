package grievance_management.complaint.repository;

import grievance_management.complaint.entity.StatusHistory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatusHistoryRepository
        extends JpaRepository<StatusHistory, Long> {

    List<StatusHistory> findByComplaintIdOrderByCreatedAtAsc(
            Long complaintId
    );
}