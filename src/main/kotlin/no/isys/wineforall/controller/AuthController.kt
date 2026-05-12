package no.isys.wineforall.controller

import no.isys.wineforall.repository.AppUserRepository
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(private val userRepository: AppUserRepository) {

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal oidcUser: OidcUser): Map<String, Any?> {
        val email = oidcUser.email
            ?: return mapOf("error" to "Ukjent bruker")

        val user = userRepository.findByEmail(email)
            ?: return mapOf("error" to "Bruker ikke funnet")

        return mapOf(
            "email" to user.email,
            "name" to user.name,
            "role" to user.role.name
        )
    }
}
