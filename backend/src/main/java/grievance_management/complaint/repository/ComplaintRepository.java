package grievance_management.complaint.repository;

import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository
        extends JpaRepository<Complaint, Long> {

    List<Complaint> findByCitizenId(Long citizenId);

    List<Complaint> findByVillageId(Long villageId);

    List<Complaint> findByVillageIdAndParentComplaintIdIsNull(Long villageId);

    List<Complaint> findByVillageIdAndStatusAndParentComplaintIdIsNull(
            Long villageId,
            ComplaintStatus status
    );

    List<Complaint> findByParentComplaintIdIsNull();

    List<Complaint> findByParentComplaintId(Long parentComplaintId);

    List<Complaint> findByVillageIdAndStatus(
            Long villageId,
            ComplaintStatus status
    );

    List<Complaint> findByWardId(Long wardId);

    List<Complaint> findByEscalationLevel(Integer escalationLevel);

    List<Complaint> findByEscalationLevelAndParentComplaintIdIsNull(Integer escalationLevel);

    List<Complaint> findTop5ByOrderByCreatedAtDesc();
}