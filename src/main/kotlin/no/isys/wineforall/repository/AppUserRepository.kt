package no.isys.wineforall.repository

import no.isys.wineforall.model.AppUser
import org.springframework.data.jpa.repository.JpaRepository

interface AppUserRepository : JpaRepository<AppUser, Long> {
    fun findByEmail(email: String): AppUser?
}
