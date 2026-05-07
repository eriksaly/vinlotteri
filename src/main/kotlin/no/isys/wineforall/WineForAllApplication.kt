package no.isys.wineforall

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class WineForAllApplication

fun main(args: Array<String>) {
    runApplication<WineForAllApplication>(*args)
}
