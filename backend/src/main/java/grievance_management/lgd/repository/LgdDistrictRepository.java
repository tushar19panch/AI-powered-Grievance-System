package grievance_management.lgd.repository;

import grievance_management.lgd.entity.LgdDistrict;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LgdDistrictRepository
        extends JpaRepository<LgdDistrict, Long> {

    List<LgdDistrict> findAllByOrderByNameAsc();

    Optional<LgdDistrict> findByLgdCode(Long lgdCode);
}
