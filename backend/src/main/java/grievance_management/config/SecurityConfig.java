package grievance_management.config;

import grievance_management.auth.filter.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                // Enable CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Disable CSRF because we are using JWT
                .csrf(csrf -> csrf.disable())

                // Stateless authentication
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        // Preflight requests
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()

                        // Public APIs
                        .requestMatchers(
                                "/",
                                "/error",
                                "/index.html",
                                "/css/**",
                                "/js/**",

                                // Backend test
                                "/api/test",

                                // Registration
                                "/api/users/register",

                                // Login & Auth
                                "/api/auth/**",

                                // Village APIs
                                "/api/villages",
                                "/api/villages/**",

                                // Ward APIs
                                "/api/wards",
                                "/api/wards/**",

                                // Uploaded files
                                "/uploads/**"
                        ).permitAll()

                        // Citizen APIs
                        .requestMatchers("/api/citizen/**")
                        .hasRole("CITIZEN")

                        // Sarpanch, Secretary & District Super Admins
                        .requestMatchers("/api/sarpanch/**")
                        .hasAnyRole("SARPANCH", "SECRETARY", "SUPER_ADMIN", "DISTRICT_OFFICER")

                        // Secretary APIs
                        .requestMatchers("/api/secretary/**")
                        .hasAnyRole("SECRETARY", "SUPER_ADMIN", "DISTRICT_OFFICER")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                // JWT filter
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    /*
     * ============================================================
     * CORS CONFIGURATION
     * ============================================================
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOriginPatterns(
                Arrays.asList(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "*"
                )
        );

        /*
         * HTTP methods allowed from frontend
         */
        configuration.setAllowedMethods(
                Arrays.asList(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        /*
         * Allow request headers
         */
        configuration.setAllowedHeaders(
                Arrays.asList("*")
        );

        /*
         * Allow Authorization header
         */
        configuration.setExposedHeaders(
                Arrays.asList("Authorization")
        );

        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }

    /*
     * Password encoder
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}