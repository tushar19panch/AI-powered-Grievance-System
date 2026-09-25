package grievance_management.village.repository;

import grievance_management.village.entity.Village;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VillageRepository extends JpaRepository<Village, Long> {

    Optional<Village> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByName(String name);
}