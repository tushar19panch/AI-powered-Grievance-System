 package grievance_management.auth.controller;

import grievance_management.auth.service.AuthService;
import grievance_management.user.dto.LoginRequest;
import grievance_management.user.dto.LoginResponse;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody grievance_management.user.dto.ResetPasswordRequest request) {

        authService.resetPassword(request);

        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "Password reset successfully"
        ));
    }
}