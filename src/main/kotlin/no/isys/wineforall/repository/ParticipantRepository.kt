package no.isys.wineforall.repository

import no.isys.wineforall.model.Participant
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ParticipantRepository : JpaRepository<Participant, Long> {
    fun findByTagIgnoreCase(tag: String): Participant?
    fun existsByTagIgnoreCase(tag: String): Boolean

    @Query("SELECT p FROM Participant p ORDER BY p.name")
    fun findAllOrderByName(): List<Participant>
}
