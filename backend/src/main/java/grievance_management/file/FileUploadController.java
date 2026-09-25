package grievance_management.file;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final Path uploadDirectory =
            Paths.get("uploads");

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file) {

        try {

            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "File is empty"
                        ));
            }

            Files.createDirectories(uploadDirectory);

            String originalName =
                    file.getOriginalFilename();

            String extension = "";

            if (originalName != null &&
                    originalName.contains(".")) {

                extension = originalName.substring(
                        originalName.lastIndexOf(".")
                );
            }

            String fileName =
                    UUID.randomUUID() + extension;

            Path filePath =
                    uploadDirectory.resolve(fileName);

            Files.write(
                    filePath,
                    file.getBytes()
            );

            String photoUrl =
                    "/uploads/" + fileName;

            return ResponseEntity.ok(
                    Map.of(
                            "message", "File uploaded successfully",
                            "photo", photoUrl
                    )
            );

        } catch (IOException e) {

            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "message",
                            "Failed to upload file"
                    ));
        }
    }
}