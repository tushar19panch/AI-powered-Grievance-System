package grievance_management.auth.service;

import grievance_management.auth.service.JwtService;
import grievance_management.user.dto.LoginRequest;
import grievance_management.user.dto.LoginResponse;
import grievance_management.user.entity.User;
import grievance_management.user.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {

        String identifier = request.getEffectiveIdentifier();
        if (identifier.isEmpty()) {
            throw new RuntimeException("Mobile number or Official ID is required");
        }

        // Find user using mobile number OR official ID (for Sarpanch / Secretary)
        User user = userRepository
                .findByMobileNumber(identifier)
                .or(() -> userRepository.findByOfficialId(identifier))
                .orElseThrow(() ->
                        new RuntimeException(
                                "Invalid ID / Mobile number or password"
                        )
                );

        // Check password using BCrypt
        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            throw new RuntimeException(
                    "Invalid mobile number or password"
            );
        }

        // Subject for JWT
        String subject = user.getMobileNumber();
        if (subject == null || subject.isBlank()) {
            subject = user.getOfficialId();
        }

        // Generate JWT token
        String token = jwtService.generateToken(
                user.getId(),
                subject,
                user.getRole().name()
        );

        String villageName = user.getVillage() != null ? user.getVillage().getName() : null;
        String wardNumber = user.getWard() != null ? user.getWard().getWardNumber() : null;

        // Return response without password
        return new LoginResponse(
                token,
                user.getId(),
                user.getName(),
                user.getMobileNumber(),
                user.getRole(),
                villageName,
                wardNumber
        );
    }

    public void resetPassword(grievance_management.user.dto.ResetPasswordRequest request) {
        String identifier = request.getIdentifier() != null ? request.getIdentifier().trim() : "";
        if (identifier.isEmpty()) {
            throw new RuntimeException("Mobile number or Official ID is required");
        }

        // Find user by mobile number OR official ID
        User user = userRepository
                .findByMobileNumber(identifier)
                .or(() -> userRepository.findByOfficialId(identifier))
                .orElseThrow(() -> new RuntimeException("User not found with this Mobile Number / Official ID"));

        if (request.getNewPassword() == null || request.getNewPassword().trim().length() < 4) {
            throw new RuntimeException("Password must be at least 4 characters long");
        }

        // Encode and update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        userRepository.save(user);
    }
}