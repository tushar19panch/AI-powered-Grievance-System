package grievance_management.complaint.repository;

import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository
        extends JpaRepository<Complaint, Long> {

    List<Complaint> findByCitizenId(Long citizenId);

    List<Complaint> findByVillageId(Long villageId);

    List<Complaint> findByVillageIdAndStatus(
            Long villageId,
            ComplaintStatus status
    );

    List<Complaint> findByWardId(Long wardId);
}