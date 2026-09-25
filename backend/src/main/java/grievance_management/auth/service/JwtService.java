 package grievance_management.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    /*
     * JWT secret is stored in application.properties
     *
     * Example:
     * jwt.secret=MyVillageGrievanceSystemSecretKeyForJWT2026Secure
     */
    @Value("${jwt.secret}")
    private String secretKey;

    /*
     * Token expiration time is also stored in
     * application.properties.
     *
     * 86400000 milliseconds = 24 hours
     */
    @Value("${jwt.expiration}")
    private long expirationTime;


    // =========================================================
    // Create signing key
    // =========================================================

    private SecretKey getSigningKey() {

        return Keys.hmacShaKeyFor(
                secretKey.getBytes(StandardCharsets.UTF_8)
        );
    }


    // =========================================================
    // Generate JWT Token
    // =========================================================

    public String generateToken(
            Long userId,
            String mobileNumber,
            String role) {

        Date now = new Date();

        Date expiration = new Date(
                now.getTime() + expirationTime
        );

        return Jwts.builder()

                // User's mobile number
                .subject(mobileNumber)

                // User ID
                .claim("userId", userId)

                // User role
                .claim("role", role)

                // Token creation time
                .issuedAt(now)

                // Token expiry time
                .expiration(expiration)

                // Sign the token
                .signWith(getSigningKey())

                // Convert to String
                .compact();
    }


    // =========================================================
    // Extract mobile number from JWT
    // =========================================================

    public String extractMobileNumber(String token) {

        Claims claims = extractAllClaims(token);

        return claims.getSubject();
    }


    // =========================================================
    // Extract all claims from JWT
    // =========================================================

    public Claims extractAllClaims(String token) {

        return Jwts.parser()

                // Verify JWT signature
                .verifyWith(getSigningKey())

                .build()

                // Validate and parse token
                .parseSignedClaims(token)

                // Get token payload
                .getPayload();
    }


    // =========================================================
    // Check whether JWT is valid
    // =========================================================

    public boolean isTokenValid(String token) {

        try {

            extractAllClaims(token);

            return true;

        } catch (Exception e) {

            return false;
        }
    }
}