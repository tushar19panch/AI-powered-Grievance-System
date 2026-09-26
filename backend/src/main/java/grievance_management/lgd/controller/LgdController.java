package grievance_management.lgd.controller;

import grievance_management.lgd.entity.*;
import grievance_management.lgd.repository.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lgd")
public class LgdController {

    private final LgdDistrictRepository districtRepository;
    private final LgdSubDistrictRepository subDistrictRepository;
    private final LgdBlockRepository blockRepository;
    private final LgdGramPanchayatRepository gramPanchayatRepository;
    private final LgdVillageRepository villageRepository;
    private final LgdWardRepository wardRepository;

    public LgdController(
            LgdDistrictRepository districtRepository,
            LgdSubDistrictRepository subDistrictRepository,
            LgdBlockRepository blockRepository,
            LgdGramPanchayatRepository gramPanchayatRepository,
            LgdVillageRepository villageRepository,
            LgdWardRepository wardRepository
    ) {
        this.districtRepository = districtRepository;
        this.subDistrictRepository = subDistrictRepository;
        this.blockRepository = blockRepository;
        this.gramPanchayatRepository = gramPanchayatRepository;
        this.villageRepository = villageRepository;
        this.wardRepository = wardRepository;
    }

    // ==========================================
    // DISTRICTS
    // ==========================================

    @GetMapping("/districts")
    public List<LgdDistrict> getDistricts() {
        return districtRepository.findAllByOrderByNameAsc();
    }

    // ==========================================
    // SUB-DISTRICTS
    // ==========================================

    @GetMapping("/districts/{districtCode}/sub-districts")
    public List<LgdSubDistrict> getSubDistricts(
            @PathVariable Long districtCode
    ) {
        return subDistrictRepository
                .findByDistrict_LgdCodeOrderByNameAsc(districtCode);
    }

    // ==========================================
    // BLOCKS
    // ==========================================

    @GetMapping("/districts/{districtCode}/blocks")
    public List<LgdBlock> getBlocks(
            @PathVariable Long districtCode
    ) {
        return blockRepository
                .findByDistrict_LgdCodeOrderByNameAsc(districtCode);
    }

    // ==========================================
    // GRAM PANCHAYATS
    // ==========================================

    @GetMapping("/blocks/{blockCode}/panchayats")
    public List<LgdGramPanchayat> getGramPanchayats(
            @PathVariable Long blockCode
    ) {
        return gramPanchayatRepository
                .findByBlock_LgdCodeOrderByNameAsc(blockCode);
    }

    // ==========================================
    // VILLAGES
    // ==========================================

    @GetMapping("/panchayats/{panchayatCode}/villages")
    public List<LgdVillage> getVillages(
            @PathVariable Long panchayatCode
    ) {
        return villageRepository
                .findByGramPanchayat_LgdCodeOrderByNameAsc(
                        panchayatCode
                );
    }

    // ==========================================
    // WARDS
    // ==========================================

    @GetMapping("/panchayats/{panchayatCode}/wards")
    public List<LgdWard> getWards(
            @PathVariable Long panchayatCode
    ) {
        return wardRepository
                .findByGramPanchayat_LgdCodeOrderByWardNumberAsc(
                        panchayatCode
                );
    }
}
