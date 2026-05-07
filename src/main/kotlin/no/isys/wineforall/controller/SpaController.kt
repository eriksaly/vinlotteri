package no.isys.wineforall.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class SpaController {
    // Forward all non-API, non-static routes to React's index.html
    @GetMapping(value = ["/{path:^(?!api).*}", "/{path:^(?!api).*}/**"])
    fun forward(): String = "forward:/index.html"
}
