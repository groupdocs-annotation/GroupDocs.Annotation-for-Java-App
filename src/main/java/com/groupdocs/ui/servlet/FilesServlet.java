package com.groupdocs.ui.servlet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupdocs.ui.Utils;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;

@WebServlet("/files")
public class FilesServlet extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setHeader("Content-Type", "application/json");

        ArrayList<String> list = new ArrayList<>();
        Files.newDirectoryStream(
                Paths.get(Utils.getStoragePath()),
                entry -> Files.isRegularFile(entry) && !entry.getFileName().toString().startsWith("GroupDocs.") && !entry.getFileName().toString().equalsIgnoreCase("README.txt")
        ).forEach(path -> {
            list.add(path.getFileName().toString());
        });

        new ObjectMapper().writeValue(response.getOutputStream(), list);
    }

}

