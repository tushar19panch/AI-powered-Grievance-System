 package grievance_management.user.dto;

import grievance_management.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private Long userId;
    private String name;
    private String mobileNumber;
    private Role role;
    private String villageName;
    private String wardNumber;
    private String officialId;
    private String district;
    private String block;

    public LoginResponse(String token, Long userId, String name, String mobileNumber, Role role) {
        this.token = token;
        this.userId = userId;
        this.name = name;
        this.mobileNumber = mobileNumber;
        this.role = role;
    }

    public LoginResponse(String token, Long userId, String name, String mobileNumber, Role role, String villageName, String wardNumber) {
        this.token = token;
        this.userId = userId;
        this.name = name;
        this.mobileNumber = mobileNumber;
        this.role = role;
        this.villageName = villageName;
        this.wardNumber = wardNumber;
    }
}