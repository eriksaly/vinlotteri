package no.isys.wineforall.repository

import no.isys.wineforall.model.Participant
import org.jetbrains.exposed.v1.core.Expression
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.isNotNull
import org.jetbrains.exposed.v1.core.lowerCase
import org.jetbrains.exposed.v1.core.stringParam
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

private val hasPhoto = Participants.photoData.isNotNull()

// Every column of a participant but the photo, so lists of participants don't load every photo
internal val participantColumns: List<Expression<*>> =
    listOf(Participants.id, Participants.name, Participants.tag, hasPhoto, Participants.createdAt)

// From a row selected with participantColumns
internal fun ResultRow.toParticipant() = Participant(
    id = this[Participants.id],
    name = this[Participants.name],
    tag = this[Participants.tag],
    hasPhoto = this[hasPhoto],
    createdAt = this[Participants.createdAt]
)

@Repository
@Transactional
class ParticipantRepository {

    fun findAll(): List<Participant> =
        Participants.select(participantColumns).orderBy(Participants.id).map { it.toParticipant() }

    fun findAllOrderByName(): List<Participant> =
        Participants.select(participantColumns).orderBy(Participants.name).map { it.toParticipant() }

    fun findById(id: Long): Participant? =
        Participants.select(participantColumns).where { Participants.id eq id }.singleOrNull()?.toParticipant()

    fun existsByTagIgnoreCase(tag: String): Boolean =
        !Participants.selectAll().where { Participants.tag.lowerCase() eq stringParam(tag).lowerCase() }.empty()

    // The photo and its content type, or null if the participant has no photo
    fun findPhoto(id: Long): Pair<ByteArray, String?>? =
        Participants.select(Participants.photoData, Participants.photoContentType)
            .where { (Participants.id eq id) and Participants.photoData.isNotNull() }
            .singleOrNull()
            ?.let { it[Participants.photoData]!! to it[Participants.photoContentType] }

    // Without a photo; updatePhoto adds one
    fun insert(participant: Participant): Participant {
        val id = Participants.insert {
            it[name] = participant.name
            it[tag] = participant.tag
            it[createdAt] = participant.createdAt
        } get Participants.id
        return participant.copy(id = id, hasPhoto = false)
    }

    fun update(participant: Participant) {
        Participants.update({ Participants.id eq participant.id }) {
            it[name] = participant.name
            it[tag] = participant.tag
        }
    }

    // Null data removes the photo
    fun updatePhoto(id: Long, data: ByteArray?, contentType: String?) {
        Participants.update({ Participants.id eq id }) {
            it[photoData] = data
            it[photoContentType] = contentType
        }
    }
}
