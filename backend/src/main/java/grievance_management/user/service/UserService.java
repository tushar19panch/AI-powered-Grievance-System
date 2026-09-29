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

        // ---------------------------------------------------------
        // Citizen constraint:
        // A citizen CANNOT register unless their village exists & matches in the database.
        // Prevents unregistered/random entries from polluting the system.
        // ---------------------------------------------------------
        if (request.getRole() == Role.CITIZEN) {

            // Match by village ID if provided
            if (request.getVillageId() != null) {
                return villageRepository.findById(request.getVillageId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Selected village does not exist in the database. Citizen registration is only permitted for registered villages."
                                ));
            }

            // Match by village name (case-insensitive) if provided
            if (request.getVillageName() != null &&
                    !request.getVillageName().trim().isEmpty()) {

                String trimmedName = request.getVillageName().trim();
                return villageRepository
                        .findByNameIgnoreCase(trimmedName)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Village '" + trimmedName + "' is not registered in the system. Citizen registration is only permitted for registered villages."
                                ));
            }

            throw new RuntimeException(
                    "Village is required for citizen registration. Please enter or select a valid registered village."
            );
        }

        // ---------------------------------------------------------
        // Administrative roles (Sarpanch / Secretary):
        // ---------------------------------------------------------

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

        throw new RuntimeException("Village is required for registration");
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

    // =====================================================
    // GET VILLAGE OFFICIALS (SARPANCH & SECRETARY SYNC)
    // =====================================================

    public grievance_management.user.dto.VillageOfficialsResponse getVillageOfficials(String villageName, Long villageId) {
        Village village = null;

        if (villageId != null) {
            village = villageRepository.findById(villageId).orElse(null);
        }

        if (village == null && villageName != null && !villageName.isBlank()) {
            village = villageRepository.findByNameIgnoreCase(villageName.trim()).orElse(null);
        }

        if (village == null) {
            // Check if any village contains part of the name
            if (villageName != null && !villageName.isBlank()) {
                java.util.List<Village> all = villageRepository.findAll();
                for (Village v : all) {
                    if (v.getName() != null && v.getName().equalsIgnoreCase(villageName.trim())) {
                        village = v;
                        break;
                    }
                }
            }
        }

        grievance_management.user.dto.VillageOfficialsResponse.OfficialInfo sarpanchInfo = null;
        grievance_management.user.dto.VillageOfficialsResponse.OfficialInfo secretaryInfo = null;

        if (village != null) {
            java.util.List<User> users = userRepository.findByVillage(village);
            for (User u : users) {
                if (u.getRole() == Role.SARPANCH || u.getRole() == Role.SUPER_ADMIN) {
                    sarpanchInfo = grievance_management.user.dto.VillageOfficialsResponse.OfficialInfo.builder()
                            .name(u.getName())
                            .mobile(u.getMobileNumber())
                            .officialId(u.getOfficialId())
                            .role("SARPANCH")
                            .village(village.getName())
                            .build();
                } else if (u.getRole() == Role.SECRETARY || u.getRole() == Role.DISTRICT_OFFICER) {
                    secretaryInfo = grievance_management.user.dto.VillageOfficialsResponse.OfficialInfo.builder()
                            .name(u.getName())
                            .mobile(u.getMobileNumber())
                            .officialId(u.getOfficialId())
                            .role("SECRETARY")
                            .village(village.getName())
                            .build();
                }
            }
        }

        return grievance_management.user.dto.VillageOfficialsResponse.builder()
                .villageId(village != null ? village.getId() : villageId)
                .villageName(village != null ? village.getName() : villageName)
                .sarpanch(sarpanchInfo)
                .secretary(secretaryInfo)
                .build();
    }
}