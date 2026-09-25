package grievance_management.auth.filter;

import grievance_management.auth.service.JwtService;

import io.jsonwebtoken.Claims;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // Get Authorization header
        String authorizationHeader =
                request.getHeader("Authorization");

        // No Authorization header
        if (authorizationHeader == null ||
                !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        // Remove "Bearer " from token
        String token =
                authorizationHeader.substring(7);

        try {

            // Check whether token is valid
            if (jwtService.isTokenValid(token)) {

                // Get mobile number from JWT
                String mobileNumber =
                        jwtService.extractMobileNumber(token);

                // Get all JWT claims
                Claims claims =
                        jwtService.extractAllClaims(token);

                // Get role from JWT
                String role =
                        claims.get("role", String.class);

                // Make sure role exists
                if (role != null && !role.isBlank()) {

                    // Convert:
                    // CITIZEN → ROLE_CITIZEN
                    // SARPANCH → ROLE_SARPANCH
                    // SECRETARY → ROLE_SECRETARY

                    SimpleGrantedAuthority authority =
                            new SimpleGrantedAuthority(
                                    "ROLE_" + role
                            );

                    // Create authentication object
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    mobileNumber,
                                    null,
                                    List.of(authority)
                            );

                    // Put authentication into SecurityContext
                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(authentication);
                }
            }

        } catch (Exception e) {

            // Invalid JWT
            SecurityContextHolder
                    .clearContext();

            System.out.println(
                    "JWT Authentication failed: "
                            + e.getMessage()
            );
        }

        // Continue request
        filterChain.doFilter(request, response);
    }
}