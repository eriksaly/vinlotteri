package no.isys.wineforall.model

import java.time.Instant

// Without the photo itself, which ParticipantRepository.findPhoto loads when it's needed
data class Participant(
    val id: Long = 0,
    val name: String,
    val tag: String,
    val hasPhoto: Boolean = false,
    val createdAt: Instant = Instant.now()
)
