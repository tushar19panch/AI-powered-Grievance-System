package grievance_management.lgd.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "lgd_villages",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "lgd_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LgdVillage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lgd_code", nullable = false)
    private Long lgdCode;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id")
    private LgdDistrict district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_district_id")
    private LgdSubDistrict subDistrict;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gram_panchayat_id")
    private LgdGramPanchayat gramPanchayat;
}
