package grievance_management.config;

import grievance_management.complaint.entity.Complaint;
import grievance_management.complaint.entity.ComplaintStatus;
import grievance_management.complaint.repository.ComplaintRepository;
import grievance_management.user.entity.Role;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final VillageRepository villageRepository;
    private final WardRepository wardRepository;
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    public DataInitializer(
            VillageRepository villageRepository,
            WardRepository wardRepository,
            UserRepository userRepository,
            ComplaintRepository complaintRepository,
            PasswordEncoder passwordEncoder,
            EntityManager entityManager) {
        this.villageRepository = villageRepository;
        this.wardRepository = wardRepository;
        this.userRepository = userRepository;
        this.complaintRepository = complaintRepository;
        this.passwordEncoder = passwordEncoder;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public void run(String... args) {
        try {
            log.info("Checking and initializing village, ward, and demo grievance records...");

            // 1. Village
            Village village = villageRepository.findAll().stream().findFirst().orElseGet(() -> {
                Village v = Village.builder()
                        .name("Pipariya")
                        .district("Hoshangabad")
                        .state("Madhya Pradesh")
                        .build();
                return villageRepository.save(v);
            });

            // 2. Wards
            Ward ward1 = wardRepository.findByVillageIdAndWardNumber(village.getId(), "1").orElseGet(() ->
                    wardRepository.save(Ward.builder().wardNumber("1").village(village).build()));
            Ward ward2 = wardRepository.findByVillageIdAndWardNumber(village.getId(), "2").orElseGet(() ->
                    wardRepository.save(Ward.builder().wardNumber("2").village(village).build()));
            Ward ward3 = wardRepository.findByVillageIdAndWardNumber(village.getId(), "3").orElseGet(() ->
                    wardRepository.save(Ward.builder().wardNumber("3").village(village).build()));
            Ward ward4 = wardRepository.findByVillageIdAndWardNumber(village.getId(), "4").orElseGet(() ->
                    wardRepository.save(Ward.builder().wardNumber("4").village(village).build()));

            // 3. Citizen User
            User citizen = userRepository.findByMobileNumber("9876543210").orElseGet(() ->
                    userRepository.save(User.builder()
                            .name("Ramesh Patel")
                            .mobileNumber("9876543210")
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.CITIZEN)
                            .village(village)
                            .ward(ward3)
                            .build()));

            // 4. Officials
            userRepository.findByMobileNumber("9876543211").orElseGet(() ->
                    userRepository.save(User.builder()
                            .name("Shri Ramesh Patel")
                            .mobileNumber("9876543211")
                            .officialId("SAR-001")
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.SARPANCH)
                            .village(village)
                            .build()));

            userRepository.findByMobileNumber("9876543212").orElseGet(() ->
                    userRepository.save(User.builder()
                            .name("Shri Suresh Sharma")
                            .mobileNumber("9876543212")
                            .officialId("SEC-001")
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.SECRETARY)
                            .village(village)
                            .build()));

            userRepository.findByMobileNumber("9876543213").ifPresentOrElse(
                    bdo -> {
                        if (bdo.getBlock() == null || bdo.getDistrict() == null) {
                            bdo.setBlock("Shahpur Block");
                            bdo.setDistrict("Sehore");
                            userRepository.save(bdo);
                        }
                    },
                    () -> userRepository.save(User.builder()
                            .name("Shri Alok Verma (BDO)")
                            .mobileNumber("9876543213")
                            .officialId("BDO-001")
                            .block("Shahpur Block")
                            .district("Sehore")
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.BLOCK_OFFICER)
                            .village(village)
                            .build())
            );

            userRepository.findByMobileNumber("9876543214").ifPresentOrElse(
                    dm -> {
                        if (dm.getDistrict() == null) {
                            dm.setDistrict("Indore");
                            userRepository.save(dm);
                        }
                    },
                    () -> userRepository.save(User.builder()
                            .name("Smt. Neha Sharma (DM / District Officer)")
                            .mobileNumber("9876543214")
                            .officialId("DM-001")
                            .district("Indore")
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.DISTRICT_OFFICER)
                            .village(village)
                            .build())
            );

            // 5. Ensure Complaint #38 exists in MySQL
            Optional<Complaint> c38Opt = complaintRepository.findById(38L);
            if (c38Opt.isEmpty()) {
                log.info("Seeding canonical demo Complaint #38 into MySQL...");
                try {
                    entityManager.createNativeQuery(
                            "INSERT INTO complaints (id, problem_type, category, priority, department, location, description, status, sentiment, created_at, deadline, village_id, ward_id, citizen_id, classification, classification_reason) " +
                            "VALUES (38, 'Water Supply', 'Water Supply', 'MEDIUM', 'Water Supply & Sanitation Department', 'Ward 3, Near Primary School', 'Main pipeline broken near primary school, water supply unavailable for 3 days', 'IN_PROGRESS', 'NEGATIVE', :createdAt, :deadline, :villageId, :wardId, :citizenId, 'GENUINE', 'Physical pipeline leakage verified on site') " +
                            "ON DUPLICATE KEY UPDATE status = 'IN_PROGRESS'"
                    )
                    .setParameter("createdAt", LocalDateTime.now().minusDays(3))
                    .setParameter("deadline", LocalDate.now().plusDays(2))
                    .setParameter("villageId", village.getId())
                    .setParameter("wardId", ward3.getId())
                    .setParameter("citizenId", citizen.getId())
                    .executeUpdate();
                    log.info("Demo Complaint #38 successfully seeded in database.");
                } catch (Exception e) {
                    log.warn("Native query insert for Complaint #38: {}", e.getMessage());
                }
            }

            // 6. Ensure at least one recent complaint exists if table empty
            if (complaintRepository.count() == 0) {
                Complaint sample = Complaint.builder()
                        .problemType("Water Supply")
                        .category("Water Supply")
                        .priority("MEDIUM")
                        .department("Water Supply Department")
                        .location("Ward 3, Near Primary School")
                        .description("Water supply pipeline leakage near primary school")
                        .status(ComplaintStatus.IN_PROGRESS)
                        .sentiment("NEGATIVE")
                        .createdAt(LocalDateTime.now().minusDays(2))
                        .deadline(LocalDate.now().plusDays(3))
                        .village(village)
                        .ward(ward3)
                        .citizen(citizen)
                        .build();
                complaintRepository.save(sample);
            }

            log.info("Data initialization check complete. Database ready.");
        } catch (Exception e) {
            log.warn("Data initialization encountered non-fatal error: {}", e.getMessage());
        }
    }
}
