package grievance_management.user.dto;

import grievance_management.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserResponse {

    private Long id;

    private String name;

    private String mobileNumber;

    private Role role;

    private String officialId;

    private Long villageId;

    private String villageName;

    private Long wardId;

    private String wardNumber;
}