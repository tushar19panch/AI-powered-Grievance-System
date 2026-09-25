package grievance_management.village.controller;

import grievance_management.village.entity.Village;
import grievance_management.village.entity.Ward;
import grievance_management.village.repository.VillageRepository;
import grievance_management.village.repository.WardRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wards")
public class WardController {

    private final WardRepository wardRepository;
    private final VillageRepository villageRepository;

    public WardController(
            WardRepository wardRepository,
            VillageRepository villageRepository) {

        this.wardRepository = wardRepository;
        this.villageRepository = villageRepository;
    }

    @GetMapping
    public ResponseEntity<List<Ward>> getWards(
            @RequestParam(required = false) Long villageId) {

        if (villageId != null) {
            return ResponseEntity.ok(
                    wardRepository.findByVillageId(villageId)
            );
        }

        return ResponseEntity.ok(wardRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Ward> createWard(
            @RequestParam Long villageId,
            @RequestBody Ward ward) {

        Village village = villageRepository
                .findById(villageId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Village not found"
                        )
                );

        ward.setVillage(village);

        Ward savedWard =
                wardRepository.save(ward);

        return ResponseEntity.ok(savedWard);
    }
}