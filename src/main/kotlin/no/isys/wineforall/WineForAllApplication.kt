package no.isys.wineforall

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class WineForAllApplication

fun main(args: Array<String>) {
    runApplication<WineForAllApplication>(*args)
}
