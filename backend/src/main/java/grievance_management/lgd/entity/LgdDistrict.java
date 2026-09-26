package grievance_management.lgd.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "lgd_districts",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "lgd_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LgdDistrict {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lgd_code", nullable = false)
    private Long lgdCode;

    @Column(nullable = false)
    private String name;

    @Column(name = "state_code", nullable = false)
    private Integer stateCode;
}
