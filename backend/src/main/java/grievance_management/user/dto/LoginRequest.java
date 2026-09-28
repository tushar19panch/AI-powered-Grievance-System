 package grievance_management.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    private String mobileNumber;

    private String identifier;

    @NotBlank(message = "Password is required")
    private String password;

    public String getEffectiveIdentifier() {
        if (mobileNumber != null && !mobileNumber.isBlank()) {
            return mobileNumber.trim();
        }
        if (identifier != null && !identifier.isBlank()) {
            return identifier.trim();
        }
        return "";
    }
}