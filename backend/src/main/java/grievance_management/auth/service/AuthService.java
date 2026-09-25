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

        // Find user using mobile number
        User user = userRepository
                .findByMobileNumber(request.getMobileNumber())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Invalid mobile number or password"
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

        // Generate JWT token
        String token = jwtService.generateToken(
                user.getId(),
                user.getMobileNumber(),
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
}