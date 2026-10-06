package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.AppUsersRecord
import no.isys.wineforall.jooq.tables.references.APP_USERS
import no.isys.wineforall.model.AppUser
import no.isys.wineforall.model.UserRole
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class AppUserRepository(private val dsl: DSLContext) {

    fun findAll(): List<AppUser> =
        dsl.selectFrom(APP_USERS).orderBy(APP_USERS.ID).fetch { it.toAppUser() }

    fun findByEmail(email: String): AppUser? =
        dsl.selectFrom(APP_USERS).where(APP_USERS.EMAIL.eq(email)).fetchOne { it.toAppUser() }

    fun insert(user: AppUser): AppUser {
        val id = dsl.insertInto(APP_USERS).set(user.toRecord()).returningResult(APP_USERS.ID).fetchSingle().value1()!!
        return user.copy(id = id)
    }

    // Writes only the login's own fields and returns the user as stored, so a role an admin changes
    // during the login isn't overwritten, and is the one the login gets
    fun recordLogin(user: AppUser, name: String, at: Instant): AppUser =
        dsl.update(APP_USERS)
            .set(APP_USERS.NAME, name)
            .set(APP_USERS.LAST_LOGIN_AT, at)
            .where(APP_USERS.ID.eq(user.id))
            .returning()
            .fetchSingle { it.toAppUser() }

    // The updated user, or null if there is none with the id
    fun updateRole(id: Long, role: UserRole): AppUser? =
        dsl.update(APP_USERS)
            .set(APP_USERS.ROLE, role)
            .where(APP_USERS.ID.eq(id))
            .returning()
            .fetchOne { it.toAppUser() }

    fun deleteById(id: Long) {
        dsl.deleteFrom(APP_USERS).where(APP_USERS.ID.eq(id)).execute()
    }
}

private fun AppUsersRecord.toAppUser() = AppUser(
    id = id!!,
    email = email,
    // Nullable in the schema, but always set when the user is created
    name = name.orEmpty(),
    googleSub = googleSub,
    role = role,
    createdAt = createdAt,
    lastLoginAt = lastLoginAt
)

private fun AppUser.toRecord() = AppUsersRecord(
    createdAt = createdAt,
    email = email,
    googleSub = googleSub,
    lastLoginAt = lastLoginAt,
    name = name,
    role = role
)
