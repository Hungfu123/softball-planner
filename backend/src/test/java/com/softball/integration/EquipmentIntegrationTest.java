package com.softball.integration;

import com.softball.TestcontainersConfig;
import com.softball.adapter.out.persistence.repository.SpringEquipmentItemRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
@WithMockUser
class EquipmentIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private SpringEquipmentItemRepository equipmentItemRepository;

    @AfterEach
    void tearDown() {
        equipmentItemRepository.deleteAll();
    }

    @Test
    void catalog_postThenGet_listsItem() throws Exception {
        mockMvc.perform(post("/api/equipment")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Kalk\",\"quantity\":2,\"storageLocation\":\"Garage\",\"notes\":\"Linien ziehen\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Kalk"))
            .andExpect(jsonPath("$.quantity").value(2));

        mockMvc.perform(get("/api/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Kalk"))
            .andExpect(jsonPath("$[0].storageLocation").value("Garage"));
    }

    @Test
    void catalog_getEmptyByDefault() throws Exception {
        mockMvc.perform(get("/api/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
