package grievance_management.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Mobile number or ID is required")
    private String identifier;

    @NotBlank(message = "New password is required")
    private String newPassword;

    private String otp;
}
