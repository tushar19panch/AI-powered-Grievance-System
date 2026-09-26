package grievance_management.lgd.repository;

import grievance_management.lgd.entity.LgdVillage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LgdVillageRepository
        extends JpaRepository<LgdVillage, Long> {

    List<LgdVillage>
    findByGramPanchayat_LgdCodeOrderByNameAsc(Long gramPanchayatCode);
}
