package grievance_management.user.service;

import grievance_management.user.dto.RegisterRequest;
import grievance_management.user.dto.UserResponse;
import grievance_management.user.entity.Role;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final VillageRepository villageRepository;
    private final WardRepository wardRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            VillageRepository villageRepository,
            WardRepository wardRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.villageRepository = villageRepository;
        this.wardRepository = wardRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse register(RegisterRequest request) {

        // -----------------------------------------
        // 1. Check mobile number
        // -----------------------------------------

        if (userRepository.existsByMobileNumber(request.getMobileNumber())) {
            throw new RuntimeException(
                    "Mobile number is already registered"
            );
        }

        // -----------------------------------------
        // 2. Find village
        // -----------------------------------------

        Village village = findVillage(request);

        // -----------------------------------------
        // 3. Find ward if required
        // -----------------------------------------

        Ward ward = null;

        if (request.getRole() == Role.CITIZEN) {

            ward = findWard(request, village);

            if (ward == null) {
                throw new RuntimeException(
                        "Ward is required for citizen registration"
                );
            }

        } else {

            // Sarpanch and Secretary are village-level users.
            // They do not belong to a specific ward.

            if (request.getWardId() != null ||
                    (request.getWardNumber() != null && !request.getWardNumber().isBlank())) {

                throw new RuntimeException(
                        "Sarpanch and Secretary should not be assigned to a ward"
                );
            }
        }

        // -----------------------------------------
        // 4. Determine official ID
        // -----------------------------------------

        String officialId = getOfficialId(request);

        // -----------------------------------------
        // 5. Validate official ID
        // -----------------------------------------

        if (request.getRole() == Role.SARPANCH ||
                request.getRole() == Role.SECRETARY) {

            if (officialId == null || officialId.isBlank()) {

                throw new RuntimeException(
                        "Official ID is required for Sarpanch and Secretary"
                );
            }

            if (userRepository.existsByOfficialId(officialId)) {

                throw new RuntimeException(
                        "Official ID is already registered"
                );
            }

        } else {

            // Citizens do not need an official ID.
            officialId = null;
        }

        // -----------------------------------------
        // 6. Create user
        // -----------------------------------------

        User user = User.builder()
                .name(request.getName().trim())
                .mobileNumber(request.getMobileNumber().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .officialId(officialId)
                .village(village)
                .ward(ward)
                .build();

        // -----------------------------------------
        // 7. Save user
        // -----------------------------------------

        User savedUser = userRepository.save(user);

        // -----------------------------------------
        // 8. Return response
        // -----------------------------------------

        return convertToResponse(savedUser);
    }

    // =====================================================
    // FIND VILLAGE
    // =====================================================

    private Village findVillage(RegisterRequest request) {

        // First preference: villageId
        if (request.getVillageId() != null) {

            return villageRepository.findById(request.getVillageId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Village not found"
                            ));
        }

        // Second preference: villageName
        if (request.getVillageName() != null &&
                !request.getVillageName().isBlank()) {

            return villageRepository
                    .findByNameIgnoreCase(
                            request.getVillageName().trim()
                    )
                    .orElseGet(() ->
                            villageRepository.save(
                                    Village.builder()
                                            .name(request.getVillageName().trim())
                                            .district("District")
                                            .state("State")
                                            .build()
                            ));
        }

        // Fallback: Default Village
        return villageRepository.findAll().stream().findFirst()
                .orElseGet(() ->
                        villageRepository.save(
                                Village.builder()
                                        .name("Main Village")
                                        .district("District")
                                        .state("State")
                                        .build()
                        ));
    }

    // =====================================================
    // FIND WARD
    // =====================================================

    private Ward findWard(
            RegisterRequest request,
            Village village) {

        // First preference: wardId
        if (request.getWardId() != null) {

            Ward ward = wardRepository
                    .findById(request.getWardId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Ward not found"
                            ));

            // Important security check:
            // ward must belong to selected village

            if (!ward.getVillage().getId()
                    .equals(village.getId())) {

                throw new RuntimeException(
                        "Ward does not belong to the selected village"
                );
            }

            return ward;
        }

        // Second preference: wardNumber
        if (request.getWardNumber() != null &&
                !request.getWardNumber().isBlank()) {

            return wardRepository
                    .findByVillageIdAndWardNumber(
                            village.getId(),
                            request.getWardNumber().trim()
                    )
                    .orElseGet(() ->
                            wardRepository.save(
                                    Ward.builder()
                                            .wardNumber(request.getWardNumber().trim())
                                            .village(village)
                                            .build()
                            ));
        }

        // Default to ward 1 if not specified
        return wardRepository.findByVillageId(village.getId()).stream().findFirst()
                .orElseGet(() ->
                        wardRepository.save(
                                Ward.builder()
                                        .wardNumber("1")
                                        .village(village)
                                        .build()
                        ));
    }

    // =====================================================
    // GET OFFICIAL ID
    // =====================================================

    private String getOfficialId(RegisterRequest request) {

        // Generic officialId
        if (request.getOfficialId() != null &&
                !request.getOfficialId().isBlank()) {

            return request.getOfficialId().trim();
        }

        // Frontend Admin registration
        if (request.getAdminId() != null &&
                !request.getAdminId().isBlank()) {

            return request.getAdminId().trim();
        }

        // Frontend Secretary registration
        if (request.getSecretaryId() != null &&
                !request.getSecretaryId().isBlank()) {

            return request.getSecretaryId().trim();
        }

        return null;
    }

    // =====================================================
    // CONVERT USER TO RESPONSE
    // =====================================================

    private UserResponse convertToResponse(User user) {

        Long villageId = null;
        String villageName = null;

        if (user.getVillage() != null) {

            villageId = user.getVillage().getId();
            villageName = user.getVillage().getName();
        }

        Long wardId = null;
        String wardNumber = null;

        if (user.getWard() != null) {

            wardId = user.getWard().getId();
            wardNumber = user.getWard().getWardNumber();
        }

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getMobileNumber(),
                user.getRole(),
                user.getOfficialId(),
                villageId,
                villageName,
                wardId,
                wardNumber
        );
    }
}