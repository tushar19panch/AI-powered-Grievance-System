package grievance_management.village.controller;

import grievance_management.user.entity.Role;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;
import grievance_management.village.entity.Village;
import grievance_management.village.repository.VillageRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/villages")
public class VillageController {

    private final VillageRepository villageRepository;
    private final UserRepository userRepository;

    public VillageController(
            VillageRepository villageRepository,
            UserRepository userRepository) {
        this.villageRepository = villageRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Village>> getAllVillages() {
        return ResponseEntity.ok(villageRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Village> createVillage(@RequestBody Village village) {
        if (villageRepository.existsByName(village.getName())) {
            throw new RuntimeException("Village already exists");
        }
        Village savedVillage = villageRepository.save(village);
        return ResponseEntity.ok(savedVillage);
    }

    @GetMapping("/photo")
    public ResponseEntity<Map<String, String>> getVillagePhoto(@RequestParam(required = false) String village) {
        Map<String, String> response = new HashMap<>();
        if (village != null && !village.isBlank()) {
            Optional<Village> vOpt = villageRepository.findByNameIgnoreCase(village.trim());
            if (vOpt.isPresent() && vOpt.get().getPhotoUrl() != null && !vOpt.get().getPhotoUrl().isBlank()) {
                response.put("photoUrl", vOpt.get().getPhotoUrl());
                return ResponseEntity.ok(response);
            }
        }

        // Fallback: Check if any registered village has a cover photo
        List<Village> villages = villageRepository.findAll();
        for (Village v : villages) {
            if (v.getPhotoUrl() != null && !v.getPhotoUrl().isBlank()) {
                response.put("photoUrl", v.getPhotoUrl());
                return ResponseEntity.ok(response);
            }
        }

        response.put("photoUrl", "");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/photo")
    public ResponseEntity<Map<String, String>> updateVillagePhoto(@RequestBody Map<String, String> body) {
        String villageName = body.get("village");
        String photoUrl = body.get("photoUrl");

        Map<String, String> response = new HashMap<>();

        if (villageName != null && !villageName.isBlank()) {
            Optional<Village> vOpt = villageRepository.findByNameIgnoreCase(villageName.trim());
            if (vOpt.isPresent()) {
                Village v = vOpt.get();
                v.setPhotoUrl(photoUrl);
                villageRepository.save(v);
                response.put("message", "Village photo updated successfully");
                response.put("photoUrl", photoUrl != null ? photoUrl : "");
                return ResponseEntity.ok(response);
            }
        }

        // If village not found or not specified, update all existing villages
        List<Village> villages = villageRepository.findAll();
        if (!villages.isEmpty()) {
            for (Village v : villages) {
                v.setPhotoUrl(photoUrl);
                villageRepository.save(v);
            }
        }

        response.put("message", "Village photo updated successfully");
        response.put("photoUrl", photoUrl != null ? photoUrl : "");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/officials")
    public ResponseEntity<Map<String, Object>> getVillageOfficials(@RequestParam(required = false) String village) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> sarpanchInfo = new HashMap<>();
        Map<String, String> secretaryInfo = new HashMap<>();

        List<User> users = userRepository.findAll();
        for (User u : users) {
            boolean matchesVillage = true;
            if (village != null && !village.isBlank() && !village.equalsIgnoreCase("मुख्य ग्राम") && !village.equalsIgnoreCase("Gram Panchayat")) {
                matchesVillage = u.getVillage() != null &&
                        u.getVillage().getName().trim().equalsIgnoreCase(village.trim());
            }

            if (matchesVillage) {
                if (u.getRole() == Role.SARPANCH && sarpanchInfo.isEmpty()) {
                    sarpanchInfo.put("name", u.getName());
                    sarpanchInfo.put("mobile", u.getMobileNumber());
                    sarpanchInfo.put("village", u.getVillage() != null ? u.getVillage().getName() : (village != null ? village : ""));
                } else if (u.getRole() == Role.SECRETARY && secretaryInfo.isEmpty()) {
                    secretaryInfo.put("name", u.getName());
                    secretaryInfo.put("mobile", u.getMobileNumber());
                    secretaryInfo.put("village", u.getVillage() != null ? u.getVillage().getName() : (village != null ? village : ""));
                }
            }
        }

        // Fallback: If no exact village match was found, look for any Sarpanch or Secretary in DB
        if (sarpanchInfo.isEmpty() || secretaryInfo.isEmpty()) {
            for (User u : users) {
                if (u.getRole() == Role.SARPANCH && sarpanchInfo.isEmpty()) {
                    sarpanchInfo.put("name", u.getName());
                    sarpanchInfo.put("mobile", u.getMobileNumber());
                    sarpanchInfo.put("village", u.getVillage() != null ? u.getVillage().getName() : (village != null ? village : ""));
                } else if (u.getRole() == Role.SECRETARY && secretaryInfo.isEmpty()) {
                    secretaryInfo.put("name", u.getName());
                    secretaryInfo.put("mobile", u.getMobileNumber());
                    secretaryInfo.put("village", u.getVillage() != null ? u.getVillage().getName() : (village != null ? village : ""));
                }
            }
        }

        response.put("sarpanch", sarpanchInfo.isEmpty() ? null : sarpanchInfo);
        response.put("secretary", secretaryInfo.isEmpty() ? null : secretaryInfo);
        return ResponseEntity.ok(response);
    }
}