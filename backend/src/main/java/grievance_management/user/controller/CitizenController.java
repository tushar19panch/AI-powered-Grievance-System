 package grievance_management.user.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/citizen")
public class CitizenController {

    @GetMapping("/dashboard")
    public String citizenDashboard() {
        return "Welcome Citizen! You can access Citizen APIs.";
    }
}