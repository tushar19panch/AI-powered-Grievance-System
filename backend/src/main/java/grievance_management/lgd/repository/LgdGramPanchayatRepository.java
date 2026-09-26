package grievance_management.lgd.repository;

import grievance_management.lgd.entity.LgdGramPanchayat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LgdGramPanchayatRepository
        extends JpaRepository<LgdGramPanchayat, Long> {

    List<LgdGramPanchayat>
    findByBlock_LgdCodeOrderByNameAsc(Long blockCode);
}
