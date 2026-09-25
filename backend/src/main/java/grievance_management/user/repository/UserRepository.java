package grievance_management.user.repository;

import grievance_management.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByMobileNumber(String mobileNumber);

    boolean existsByMobileNumber(String mobileNumber);

    boolean existsByOfficialId(String officialId);

    Optional<User> findByOfficialId(String officialId);
}
