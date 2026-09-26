package grievance_management.lgd.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "lgd_blocks",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "lgd_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LgdBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lgd_code", nullable = false)
    private Long lgdCode;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id", nullable = false)
    private LgdDistrict district;
}
