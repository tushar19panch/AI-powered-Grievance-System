package grievance_management.lgd.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "lgd_gram_panchayats",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "lgd_code")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LgdGramPanchayat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lgd_code", nullable = false)
    private Long lgdCode;

    @Column(nullable = false)
    private String name;

    /**
     * Parent Janpad Panchayat LGD code.
     *
     * From the LGD PRI Local Body file:
     * Parent Localbody Code
     */
    @Column(name = "parent_janpad_lgd_code")
    private Long parentJanpadLgdCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id")
    private LgdBlock block;
}
