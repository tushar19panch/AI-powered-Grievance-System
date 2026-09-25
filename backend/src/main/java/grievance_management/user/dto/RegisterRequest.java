package grievance_management.user.dto;

import grievance_management.user.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String mobileNumber;

    @NotBlank
    private String password;

    @NotNull
    private Role role;

    // Backend/database IDs
    private Long villageId;

    private Long wardId;

    // Names/numbers used by the existing frontend
    private String villageName;

    private String wardNumber;

    // Generic official ID
    private String officialId;

    // Existing frontend uses adminId
    private String adminId;

    // Existing frontend uses secretaryId
    private String secretaryId;
}