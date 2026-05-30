package no.isys.wineforall.service

import no.isys.wineforall.model.AppUser
import no.isys.wineforall.model.UserRole
import no.isys.wineforall.repository.AppUserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class AppUserService(
    private val userRepository: AppUserRepository,
    @Value("\${app.bootstrap-admin-email:}") private val bootstrapAdminEmail: String,
    @Value("\${app.allowed-emails:}") private val allowedEmailsRaw: String
) : OidcUserService() {

    private val allowedEmails: Set<String> by lazy {
        allowedEmailsRaw.split(",").map { it.trim() }.filter { it.isNotBlank() }.toSet()
    }

    override fun loadUser(userRequest: OidcUserRequest): OidcUser {
        val oidcUser = super.loadUser(userRequest)

        val email = oidcUser.email
            ?: throw OAuth2AuthenticationException(
                OAuth2Error("no_email", "Ingen e-post i Google-tokenet", null)
            )

        if (!email.endsWith("@isys.no") && email !in allowedEmails) {
            throw OAuth2AuthenticationException(
                OAuth2Error("domain_not_allowed", "Bare @isys.no-brukere har tilgang til kjelleren", null)
            )
        }

        val user = userRepository.findByEmail(email) ?: run {
            val initialRole = if (bootstrapAdminEmail.isNotBlank() && email == bootstrapAdminEmail)
                UserRole.ADMIN else UserRole.USER
            userRepository.save(
                AppUser(
                    email = email,
                    name = oidcUser.fullName ?: email,
                    googleSub = oidcUser.subject,
                    role = initialRole
                )
            )
        }

        user.lastLoginAt = Instant.now()
        user.name = oidcUser.fullName ?: user.name
        if (bootstrapAdminEmail.isNotBlank() && email == bootstrapAdminEmail && user.role == UserRole.USER) {
            user.role = UserRole.ADMIN
        }
        userRepository.save(user)

        val authorities = oidcUser.authorities + SimpleGrantedAuthority("ROLE_${user.role}")
        return DefaultOidcUser(authorities, oidcUser.idToken, oidcUser.userInfo)
    }
}
