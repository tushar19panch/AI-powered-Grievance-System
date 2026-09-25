package grievance_management.village.repository;

import grievance_management.village.entity.Ward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WardRepository extends JpaRepository<Ward, Long> {

    List<Ward> findByVillageId(Long villageId);

    Optional<Ward> findByVillageIdAndWardNumber(
            Long villageId,
            String wardNumber
    );
}