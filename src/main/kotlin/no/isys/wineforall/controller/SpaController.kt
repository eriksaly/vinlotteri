package no.isys.wineforall.controller

import jakarta.servlet.http.HttpServletRequest
import org.springframework.boot.webmvc.error.ErrorController
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.RequestMapping

@Controller
class SpaController : ErrorController {
    @RequestMapping("/error")
    fun handleError(request: HttpServletRequest): String {
        val path = request.getAttribute("jakarta.servlet.error.request_uri") as? String ?: ""
        return if (path.startsWith("/api")) "forward:/api/error"
        else "forward:/index.html"
    }
}
