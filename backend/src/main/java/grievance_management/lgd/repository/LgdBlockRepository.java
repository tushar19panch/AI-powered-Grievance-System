package grievance_management.lgd.repository;

import grievance_management.lgd.entity.LgdBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LgdBlockRepository
        extends JpaRepository<LgdBlock, Long> {

    List<LgdBlock>
    findByDistrict_LgdCodeOrderByNameAsc(Long districtCode);
}
