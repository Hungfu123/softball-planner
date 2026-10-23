package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.DataExport;
import com.softball.application.DataExportService;
import com.softball.application.DataImportService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/data")
public class DataController {

    private final DataExportService dataExportService;
    private final DataImportService dataImportService;

    public DataController(final DataExportService dataExportService, final DataImportService dataImportService) {
        this.dataExportService = dataExportService;
        this.dataImportService = dataImportService;
    }

    @GetMapping("/export")
    public DataExport exportAll() {
        return dataExportService.exportAll();
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public void importAll(@RequestBody final DataExport data) {
        dataImportService.importAll(data);
    }
}
