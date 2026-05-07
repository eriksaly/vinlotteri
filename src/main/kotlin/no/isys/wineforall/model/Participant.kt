package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "participants")
class Participant(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    var tag: String,

    @Column(name = "photo_data")
    var photoData: ByteArray? = null,

    @Column(name = "photo_content_type")
    var photoContentType: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
