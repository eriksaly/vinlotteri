package no.isys.wineforall.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import no.isys.wineforall.service.AppUserService
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfFilter
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.OncePerRequestFilter

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val appUserService: AppUserService,
    @Value("\${app.allowed-origin:http://localhost:5173}") private val allowedOrigin: String
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfigurationSource()) }
            .csrf { csrf ->
                csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(CsrfTokenRequestAttributeHandler())
                    .ignoringRequestMatchers("/api/auth/logout")
            }
            .addFilterAfter(CsrfCookieFilter(), CsrfFilter::class.java)
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(
                        "/oauth2/**",
                        "/login/oauth2/**",
                        "/login",
                        "/ikke-verdig",
                        "/error"
                    ).permitAll()
                    .requestMatchers("/api/auth/**").authenticated()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll()
            }
            .oauth2Login { oauth2 ->
                oauth2
                    .userInfoEndpoint { it.oidcUserService(appUserService) }
                    .defaultSuccessUrl("$allowedOrigin/", true)
                    .failureHandler { _, response, exception ->
                        val isDomainError = (exception as? org.springframework.security.oauth2.core.OAuth2AuthenticationException)
                            ?.error?.errorCode == "domain_not_allowed"
                        val url = if (isDomainError) "$allowedOrigin/ikke-verdig" else "$allowedOrigin/login?error=auth"
                        response.sendRedirect(url)
                    }
            }
            .logout { logout ->
                logout
                    .logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler { _, response, _ ->
                        response.status = 200
                        response.contentType = "application/json;charset=UTF-8"
                        response.writer.write("""{"success":true}""")
                    }
                    .deleteCookies("JSESSIONID")
                    .permitAll()
            }
            .exceptionHandling { ex ->
                ex.authenticationEntryPoint { request, response, _ ->
                    val acceptHeader = request.getHeader("Accept") ?: ""
                    if (acceptHeader.contains("application/json") || request.requestURI.startsWith("/api/")) {
                        response.status = 401
                        response.contentType = "application/json;charset=UTF-8"
                        response.writer.write("""{"error":"Ikke innlogget"}""")
                    } else {
                        response.sendRedirect("/oauth2/authorization/google")
                    }
                }
                ex.accessDeniedHandler { _, response, _ ->
                    response.status = 403
                    response.contentType = "application/json;charset=UTF-8"
                    response.writer.write("""{"error":"Ikke tilgang"}""")
                }
            }
        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOrigins = listOf(allowedOrigin, "http://localhost:5173")
        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = true
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
    }
}

private class CsrfCookieFilter : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val csrfToken = request.getAttribute(CsrfToken::class.java.name) as? CsrfToken
        csrfToken?.token // force lazy token generation
        filterChain.doFilter(request, response)
    }
}
