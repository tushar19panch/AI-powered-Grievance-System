package grievance_management.village.controller;

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

    public VillageController(VillageRepository villageRepository) {
        this.villageRepository = villageRepository;
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
}