package com.softball.controller;

import com.softball.dto.DataExport;
import com.softball.service.DataExportService;
import com.softball.service.DataImportService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data")
public class DataExportController {

    private final DataExportService dataExportService;
    private final DataImportService dataImportService;

    public DataExportController(final DataExportService dataExportService, final DataImportService dataImportService) {
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
