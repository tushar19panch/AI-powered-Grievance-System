package grievance_management.lgd.repository;

import grievance_management.lgd.entity.LgdSubDistrict;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LgdSubDistrictRepository
        extends JpaRepository<LgdSubDistrict, Long> {

    List<LgdSubDistrict>
    findByDistrict_LgdCodeOrderByNameAsc(Long districtCode);
}
