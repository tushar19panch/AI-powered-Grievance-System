package grievance_management.user.repository;

import grievance_management.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByMobileNumber(String mobileNumber);

    boolean existsByMobileNumber(String mobileNumber);

    boolean existsByOfficialId(String officialId);

    Optional<User> findByOfficialId(String officialId);

    java.util.List<User> findByVillage(grievance_management.village.entity.Village village);

    java.util.List<User> findByVillageId(Long villageId);

    java.util.List<User> findByRole(grievance_management.user.entity.Role role);
}
