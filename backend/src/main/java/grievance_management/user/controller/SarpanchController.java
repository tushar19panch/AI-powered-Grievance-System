 package grievance_management.user.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sarpanch")
public class SarpanchController {

    @GetMapping("/dashboard")
    public String sarpanchDashboard() {
        return "Welcome Sarpanch! You can access Sarpanch APIs.";
    }
}