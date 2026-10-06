package no.isys.wineforall.repository

import no.isys.wineforall.model.AppUser
import no.isys.wineforall.model.UserRole
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.updateReturning
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Repository
@Transactional
class AppUserRepository {

    fun findAll(): List<AppUser> =
        AppUsers.selectAll().orderBy(AppUsers.id).map { it.toAppUser() }

    fun findByEmail(email: String): AppUser? =
        AppUsers.selectAll().where { AppUsers.email eq email }.singleOrNull()?.toAppUser()

    fun insert(user: AppUser): AppUser {
        val id = AppUsers.insert {
            it[createdAt] = user.createdAt
            it[email] = user.email
            it[googleSub] = user.googleSub
            it[lastLoginAt] = user.lastLoginAt
            it[name] = user.name
            it[role] = user.role
        } get AppUsers.id
        return user.copy(id = id)
    }

    // Writes only the login's own fields and returns the user as stored, so a role an admin changes
    // during the login isn't overwritten, and is the one the login gets
    fun recordLogin(user: AppUser, name: String, at: Instant): AppUser =
        AppUsers.updateReturning(where = { AppUsers.id eq user.id }) {
            it[AppUsers.name] = name
            it[lastLoginAt] = at
        }.single().toAppUser()

    // The updated user, or null if there is none with the id
    fun updateRole(id: Long, role: UserRole): AppUser? =
        AppUsers.updateReturning(where = { AppUsers.id eq id }) { it[AppUsers.role] = role }.singleOrNull()?.toAppUser()

    fun deleteById(id: Long) {
        AppUsers.deleteWhere { AppUsers.id eq id }
    }
}

private fun ResultRow.toAppUser() = AppUser(
    id = this[AppUsers.id],
    email = this[AppUsers.email],
    // Nullable in the schema, but always set when the user is created
    name = this[AppUsers.name].orEmpty(),
    googleSub = this[AppUsers.googleSub],
    role = this[AppUsers.role],
    createdAt = this[AppUsers.createdAt],
    lastLoginAt = this[AppUsers.lastLoginAt]
)
