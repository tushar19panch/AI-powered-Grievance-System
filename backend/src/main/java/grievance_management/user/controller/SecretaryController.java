package grievance_management.user.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/secretary")
public class SecretaryController {

    @GetMapping("/dashboard")
    public String secretaryDashboard() {
        return "Welcome Secretary! You can access Secretary APIs.";
    }
}