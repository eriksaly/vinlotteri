package no.isys.wineforall.model

import java.time.Instant

data class AppUser(
    val id: Long = 0,
    val email: String,
    val name: String,
    val googleSub: String,
    val role: UserRole = UserRole.USER,
    val createdAt: Instant = Instant.now(),
    val lastLoginAt: Instant? = null
)

enum class UserRole { ADMIN, USER }
