package no.isys.wineforall.config

import no.isys.wineforall.controller.AdminController
import no.isys.wineforall.controller.PublicController
import no.isys.wineforall.repository.AppUserRepository
import no.isys.wineforall.service.AppUserService
import no.isys.wineforall.service.DrawingService
import no.isys.wineforall.service.InventoryService
import no.isys.wineforall.service.LotteryService
import no.isys.wineforall.service.PrizeService
import no.isys.wineforall.service.VinmonopoletService
import no.isys.wineforall.service.WineReviewSyncJob
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

    @MockitoBean
    lateinit var vinmonopoletService: VinmonopoletService

    @MockitoBean
    lateinit var inventoryService: InventoryService

    @MockitoBean
    lateinit var prizeService: PrizeService

    @MockitoBean
    lateinit var wineReviewSyncJob: WineReviewSyncJob

    @MockitoBean
    lateinit var appUserRepository: AppUserRepository

    @MockitoBean
    lateinit var appUserService: AppUserService

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
    fun `logout is exempt from CSRF and clears the session cookie`() {
        mockMvc.perform(
            post("/api/auth/logout")
                .with(user("someone"))
        )
            .andExpect(status().isOk)
            .andExpect(cookie().maxAge("SESSION", 0))
    }
}
