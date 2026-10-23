package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.PlayCategoryRequest;
import com.softball.adapter.dto.PlayCategoryResponse;
import com.softball.application.PlayCategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/play-categories")
public class PlayCategoryController {

    private final PlayCategoryService categoryService;

    public PlayCategoryController(final PlayCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<PlayCategoryResponse> getAll() {
        return categoryService.findAll().stream().map(PlayCategoryResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlayCategoryResponse create(@Valid @RequestBody final PlayCategoryRequest request) {
        return PlayCategoryResponse.from(categoryService.create(request));
    }

    @PutMapping("/{id}")
    public PlayCategoryResponse rename(@PathVariable final Long id,
                                       @Valid @RequestBody final PlayCategoryRequest request) {
        return PlayCategoryResponse.from(categoryService.rename(id, request));
    }

    @PostMapping("/{id}/merge/{targetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void merge(@PathVariable final Long id, @PathVariable final Long targetId) {
        categoryService.merge(id, targetId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable final Long id) {
        categoryService.delete(id);
    }
}
