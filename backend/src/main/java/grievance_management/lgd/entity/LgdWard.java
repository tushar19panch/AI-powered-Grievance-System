package grievance_management.lgd.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "lgd_wards",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "lgd_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LgdWard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Official LGD Ward Code.
     */
    @Column(name = "lgd_code", nullable = false)
    private Long lgdCode;

    /**
     * Ward number inside the Gram Panchayat.
     */
    @Column(name = "ward_number", nullable = false)
    private String wardNumber;

    @Column(name = "ward_name")
    private String wardName;

    /**
     * Official Gram Panchayat / Local Body LGD code.
     */
    @Column(name = "local_body_lgd_code", nullable = false)
    private Long localBodyLgdCode;

    @Column(name = "local_body_name")
    private String localBodyName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gram_panchayat_id")
    private LgdGramPanchayat gramPanchayat;
}
