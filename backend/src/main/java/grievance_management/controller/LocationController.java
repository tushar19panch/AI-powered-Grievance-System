package grievance_management.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "*")
public class LocationController {

    private static final Map<String, List<Map<String, Object>>> DISTRICTS = new HashMap<>();
    private static final Map<String, List<Map<String, Object>>> BLOCKS = new HashMap<>();
    private static final Map<String, List<Map<String, Object>>> VILLAGES = new HashMap<>();

    static {
        // MP Districts
        List<Map<String, Object>> mpDistricts = Arrays.asList(
            createItem("INDORE", "इंदौर / Indore", "MP"),
            createItem("BHOPAL", "भोपाल / Bhopal", "MP"),
            createItem("SEHORE", "सीहोर / Sehore", "MP"),
            createItem("UJJAIN", "उज्जैन / Ujjain", "MP"),
            createItem("JABALPUR", "जबलपुर / Jabalpur", "MP"),
            createItem("GWALIOR", "ग्वालियर / Gwalior", "MP"),
            createItem("DEWAS", "देवास / Dewas", "MP"),
            createItem("DHAR", "धार / Dhar", "MP"),
            createItem("SAGAR", "सागर / Sagar", "MP"),
            createItem("REWA", "रीवा / Rewa", "MP"),
            createItem("SATNA", "सतना / Satna", "MP"),
            createItem("KHARGONE", "खरगोन / Khargone", "MP"),
            createItem("RAISEN", "रायसेन / Raisen", "MP"),
            createItem("VIDISHA", "विदिशा / Vidisha", "MP"),
            createItem("NARMADAPURAM", "नर्मदापुरम / Narmadapuram", "MP")
        );
        DISTRICTS.put("MP", mpDistricts);

        // Blocks for Sehore
        BLOCKS.put("SEHORE", Arrays.asList(
            createItem("SEHORE_BLK", "सीहोर (Sehore)", "SEHORE"),
            createItem("ASHTA", "आष्टा (Ashta)", "SEHORE"),
            createItem("ICHHAWAR", "इच्छावर (Ichhawar)", "SEHORE"),
            createItem("NASRULLAGANJ", "नसरुल्लागंज / भेरूंदा (Bhairunda)", "SEHORE"),
            createItem("BUDNI", "बुधनी (Budni)", "SEHORE")
        ));

        // Blocks for Bhopal
        BLOCKS.put("BHOPAL", Arrays.asList(
            createItem("PHANDA", "फंदा (Phanda)", "BHOPAL"),
            createItem("BERASIA", "बैरसिया (Berasia)", "BHOPAL")
        ));

        // Blocks for Indore
        BLOCKS.put("INDORE", Arrays.asList(
            createItem("INDORE_BLK", "इंदौर (Indore)", "INDORE"),
            createItem("SANWER", "सांवेर (Sanwer)", "INDORE"),
            createItem("DEPALPUR", "देपालपुर (Depalpur)", "INDORE"),
            createItem("MHOW", "महू (Dr. Ambedkar Nagar / Mhow)", "INDORE")
        ));

        // Villages for Sehore -> Sehore Block
        VILLAGES.put("SEHORE_BLK", Arrays.asList(
            createItem("PRIYAPUR", "पियापुर (Priyapur)", "SEHORE_BLK"),
            createItem("BILKISGANJ", "बिलकिसगंज (Bilkisganj)", "SEHORE_BLK"),
            createItem("SHAMPUR", "श्यामपुर (Shampur)", "SEHORE_BLK"),
            createItem("DORHA", "दोरहा (Dorha)", "SEHORE_BLK"),
            createItem("MOGRARAM", "मोगराराम (Mograram)", "SEHORE_BLK"),
            createItem("BIJOARI", "बिजोरी (Bijori)", "SEHORE_BLK")
        ));

        // Villages for Bhopal -> Phanda
        VILLAGES.put("PHANDA", Arrays.asList(
            createItem("KOLUA", "कोलुआ (Kolua)", "PHANDA"),
            createItem("BARKHEDA", "बरखेड़ा सालम (Barkheda Salam)", "PHANDA"),
            createItem("RATIBAD", "रातीबड़ (Ratibad)", "PHANDA"),
            createItem("MUGALIYA", "मुगालिया छाप (Mugaliya Chhap)", "PHANDA")
        ));

        // Villages for Indore -> Sanwer
        VILLAGES.put("SANWER", Arrays.asList(
            createItem("KANCHROD", "कचरोद (Kachrod)", "SANWER"),
            createItem("AJNOD", "अजनोद (Ajnod)", "SANWER"),
            createItem("DHANNAKHEDI", "धन्नाखेड़ी (Dhannakhedi)", "SANWER"),
            createItem("PALIA", "पालिया (Palia)", "SANWER")
        ));
    }

    private static Map<String, Object> createItem(String id, String name, String parentId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", id);
        map.put("name", name);
        map.put("parentId", parentId);
        return map;
    }

    @GetMapping("/districts")
    public List<Map<String, Object>> getDistricts(@RequestParam(defaultValue = "MP") String stateId) {
        return DISTRICTS.getOrDefault(stateId.toUpperCase(), DISTRICTS.get("MP"));
    }

    @GetMapping("/blocks")
    public List<Map<String, Object>> getBlocks(@RequestParam String districtId) {
        String key = districtId.toUpperCase();
        if (BLOCKS.containsKey(key)) {
            return BLOCKS.get(key);
        }
        // Generic fallback for any district
        return Arrays.asList(
            createItem(key + "_BLK1", "विकासखंड 1 (" + districtId + " Central)", key),
            createItem(key + "_BLK2", "विकासखंड 2 (" + districtId + " North)", key),
            createItem(key + "_BLK3", "विकासखंड 3 (" + districtId + " South)", key)
        );
    }

    @GetMapping("/villages")
    public List<Map<String, Object>> getVillages(@RequestParam String blockId) {
        String key = blockId.toUpperCase();
        if (VILLAGES.containsKey(key)) {
            return VILLAGES.get(key);
        }
        // Generic fallback for any block
        return Arrays.asList(
            createItem(key + "_VIL1", "ग्राम पंचायत आदर्श नगर (" + blockId + ")", key),
            createItem(key + "_VIL2", "ग्राम पंचायत कल्याणपुर", key),
            createItem(key + "_VIL3", "ग्राम पंचायत शिवपुरी", key),
            createItem(key + "_VIL4", "ग्राम पंचायत रामपुर", key),
            createItem(key + "_VIL5", "ग्राम पंचायत सुंदरपुर", key)
        );
    }

    @GetMapping("/wards")
    public List<Map<String, Object>> getWards(@RequestParam String villageId) {
        List<Map<String, Object>> wards = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            wards.add(createItem(String.valueOf(i), "वार्ड क्रमांक " + i + " (Ward " + i + ")", villageId));
        }
        return wards;
    }
}
