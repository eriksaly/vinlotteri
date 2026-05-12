package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "app_users")
data class AppUser(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false)
    val email: String,

    var name: String,

    @Column(nullable = false)
    val googleSub: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: UserRole = UserRole.USER,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    var lastLoginAt: Instant? = null
)

enum class UserRole { ADMIN, USER }
