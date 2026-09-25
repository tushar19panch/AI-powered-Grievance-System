 package grievance_management.village.controller;

import grievance_management.village.entity.Village;
import grievance_management.village.repository.VillageRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/villages")
public class VillageController {

    private final VillageRepository villageRepository;

    public VillageController(
            VillageRepository villageRepository) {

        this.villageRepository = villageRepository;
    }

    @GetMapping
    public ResponseEntity<List<Village>> getAllVillages() {
        return ResponseEntity.ok(villageRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Village> createVillage(
            @RequestBody Village village) {

        if (villageRepository.existsByName(
                village.getName())) {

            throw new RuntimeException(
                    "Village already exists"
            );
        }

        Village savedVillage =
                villageRepository.save(village);

        return ResponseEntity.ok(savedVillage);
    }
}