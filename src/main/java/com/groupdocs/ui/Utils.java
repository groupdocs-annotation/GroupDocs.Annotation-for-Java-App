package com.groupdocs.ui;

import com.groupdocs.annotation.common.license.License;
import com.groupdocs.annotation.domain.AnnotationInfo;
import com.groupdocs.annotation.domain.config.AnnotationConfig;
import com.groupdocs.annotation.domain.results.CreateAnnotationResult;
import com.groupdocs.annotation.handler.AnnotationImageHandler;
import com.groupdocs.annotation.handler.input.IDocumentDataHandler;
import com.groupdocs.annotation.handler.input.dataobjects.Document;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Properties;

public class Utils {
    static {
        // Load the license as early as possible
        loadLicense();
    }

    public static AnnotationImageHandler createAnnotationImageHandler() {
        AnnotationConfig cfg = new AnnotationConfig();
        cfg.setStoragePath(getStoragePath().toString());
        AnnotationImageHandler annotator = new AnnotationImageHandler(cfg);
        return annotator;

    }

    synchronized public static Document findDocumentByName(String name) {
        AnnotationImageHandler imageHandler = Utils.createAnnotationImageHandler();
        IDocumentDataHandler documentDataHandler = imageHandler.getDocumentDataHandler();
        Document doc = documentDataHandler.getDocument(name);
        if (doc != null) {
            return doc;
        }

        AnnotationInfo[] importedAnnotations;
        try (InputStream original = Files.newInputStream(getStoragePath(name))) {
            importedAnnotations = imageHandler.importAnnotations(original);
        } catch (Exception x) {
            throw new RuntimeException(x);
        }

        long documentId = imageHandler.createDocument(name);
        Arrays.stream(importedAnnotations)
                .forEach(ai -> {
                    ai.setDocumentGuid(documentId);
                    CreateAnnotationResult car = imageHandler.createAnnotation(ai);
                    Arrays.stream(ai.getReplies())
                            .forEach(ari -> {
                                imageHandler.createAnnotationReply(car.getId(), ari.getMessage());
                            });
                });
        doc = documentDataHandler.get(documentId);
        return doc;
    }

    public static void loadLicense() {
        License l = new License();
        if (Files.exists(FileSystems.getDefault().getPath(getProjectProperty("license.path")))) {
            l.setLicense(getProjectProperty("license.path"));
            if (!License.isValidLicense()) {
                throw new RuntimeException("Invalid license found.");
            }
        }
    }

    public static String getSt__oragePath() {
        return getProjectProperty("storage.path");
    }

    public static Path getStoragePath(String... name) {
        return Paths.get(getProjectProperty("storage.path"), name);
    }

    public static String getProjectProperty(String name) {
        Properties p = new Properties();
        try (InputStream i = Utils.class.getResourceAsStream("/project.properties")) {
            p.load(i);
        } catch (IOException e) {
            // Ignore
        }
        return p.getProperty(name);
    }
}
