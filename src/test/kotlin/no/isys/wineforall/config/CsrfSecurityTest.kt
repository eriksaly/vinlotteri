package no.isys.wineforall.config

import no.isys.wineforall.controller.AdminController
import no.isys.wineforall.controller.PublicController
import no.isys.wineforall.service.DrawingService
import no.isys.wineforall.service.LotteryService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(controllers = [AdminController::class, PublicController::class])
@Import(SecurityConfig::class)
class CsrfSecurityTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @MockitoBean
    lateinit var lotteryService: LotteryService

    @MockitoBean
    lateinit var drawingService: DrawingService

    @Test
    fun `GET requests set XSRF-TOKEN cookie`() {
        mockMvc.perform(get("/api/statistics"))
            .andExpect(cookie().exists("XSRF-TOKEN"))
    }

    @Test
    fun `POST without CSRF token is rejected with 403`() {
        mockMvc.perform(
            post("/api/admin/buyers")
                .contentType("application/json")
                .content("""{"participantId":1,"quantity":1}""")
                .with(user("admin").roles("ADMIN"))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `POST with CSRF token is accepted`() {
        mockMvc.perform(
            post("/api/admin/buyers")
                .contentType("application/json")
                .content("""{"participantId":1,"quantity":1}""")
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
        )
            .andExpect(status().isOk)
    }

    @Test
    fun `login endpoint is exempt from CSRF`() {
        mockMvc.perform(
            post("/api/admin/login")
                .contentType("application/x-www-form-urlencoded")
                .param("username", "wrong")
                .param("password", "wrong")
        )
            .andExpect(status().isUnauthorized)
    }
}
