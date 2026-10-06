package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.references.PARTICIPANTS
import no.isys.wineforall.model.Participant
import org.jooq.DSLContext
import org.jooq.SelectField
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.row
import org.springframework.stereotype.Repository

// A participant from PARTICIPANTS, without the photo, so lists of participants don't load every photo
internal val PARTICIPANT: SelectField<Participant> = row(
    PARTICIPANTS.ID,
    PARTICIPANTS.NAME,
    PARTICIPANTS.TAG,
    field(PARTICIPANTS.PHOTO_DATA.isNotNull),
    PARTICIPANTS.CREATED_AT
).mapping { id, name, tag, hasPhoto, createdAt -> Participant(id!!, name!!, tag!!, hasPhoto, createdAt!!) }

@Repository
class ParticipantRepository(private val dsl: DSLContext) {

    fun findAll(): List<Participant> =
        dsl.select(PARTICIPANT).from(PARTICIPANTS).orderBy(PARTICIPANTS.ID).fetch { it.value1() }

    fun findAllOrderByName(): List<Participant> =
        dsl.select(PARTICIPANT).from(PARTICIPANTS).orderBy(PARTICIPANTS.NAME).fetch { it.value1() }

    fun findById(id: Long): Participant? =
        dsl.select(PARTICIPANT).from(PARTICIPANTS).where(PARTICIPANTS.ID.eq(id)).fetchOne { it.value1() }

    fun existsByTagIgnoreCase(tag: String): Boolean =
        dsl.fetchExists(PARTICIPANTS, PARTICIPANTS.TAG.equalIgnoreCase(tag))

    // The photo and its content type, or null if the participant has no photo
    fun findPhoto(id: Long): Pair<ByteArray, String?>? =
        dsl.select(PARTICIPANTS.PHOTO_DATA, PARTICIPANTS.PHOTO_CONTENT_TYPE)
            .from(PARTICIPANTS)
            .where(PARTICIPANTS.ID.eq(id), PARTICIPANTS.PHOTO_DATA.isNotNull)
            .fetchOne { (data, contentType) -> data!! to contentType }

    // Without a photo; updatePhoto adds one
    fun insert(participant: Participant): Participant {
        val id = dsl.insertInto(PARTICIPANTS)
            .set(PARTICIPANTS.NAME, participant.name)
            .set(PARTICIPANTS.TAG, participant.tag)
            .set(PARTICIPANTS.CREATED_AT, participant.createdAt)
            .returningResult(PARTICIPANTS.ID)
            .fetchSingle().value1()!!
        return participant.copy(id = id, hasPhoto = false)
    }

    fun update(participant: Participant) {
        dsl.update(PARTICIPANTS)
            .set(PARTICIPANTS.NAME, participant.name)
            .set(PARTICIPANTS.TAG, participant.tag)
            .where(PARTICIPANTS.ID.eq(participant.id))
            .execute()
    }

    // Null data removes the photo
    fun updatePhoto(id: Long, data: ByteArray?, contentType: String?) {
        dsl.update(PARTICIPANTS)
            .set(PARTICIPANTS.PHOTO_DATA, data)
            .set(PARTICIPANTS.PHOTO_CONTENT_TYPE, contentType)
            .where(PARTICIPANTS.ID.eq(id))
            .execute()
    }
}
