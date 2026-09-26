package grievance_management.lgd.repository;

import grievance_management.lgd.entity.LgdWard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LgdWardRepository
        extends JpaRepository<LgdWard, Long> {

    List<LgdWard>
    findByGramPanchayat_LgdCodeOrderByWardNumberAsc(
            Long gramPanchayatCode
    );
}
