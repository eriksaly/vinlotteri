package no.isys.wineforall.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    @Value("\${app.admin.username}") private val adminUsername: String,
    @Value("\${app.admin.password}") private val adminPassword: String
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfigurationSource()) }
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/admin/**").authenticated()
                    .anyRequest().permitAll()
            }
            .formLogin { form ->
                form
                    .loginProcessingUrl("/api/admin/login")
                    .successHandler(successHandler())
                    .failureHandler(failureHandler())
                    .permitAll()
            }
            .logout { logout ->
                logout
                    .logoutUrl("/api/admin/logout")
                    .logoutSuccessHandler(logoutSuccessHandler())
                    .deleteCookies("JSESSIONID")
                    .permitAll()
            }
            .exceptionHandling { ex ->
                ex.authenticationEntryPoint { _, response, _ ->
                    response.status = 401
                    response.contentType = "application/json;charset=UTF-8"
                    response.writer.write("""{"error":"Ikke innlogget"}""")
                }
            }
        return http.build()
    }

    @Bean
    fun userDetailsService(): UserDetailsService {
        val user = User.withUsername(adminUsername)
            .password("{noop}$adminPassword")
            .roles("ADMIN")
            .build()
        return InMemoryUserDetailsManager(user)
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOrigins = listOf("http://localhost:5173")
        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = true
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
    }

    private fun successHandler() = AuthenticationSuccessHandler { _, response, _ ->
        response.status = 200
        response.contentType = "application/json;charset=UTF-8"
        response.writer.write("""{"success":true,"username":"$adminUsername"}""")
    }

    private fun failureHandler() = AuthenticationFailureHandler { _, response, _ ->
        response.status = 401
        response.contentType = "application/json;charset=UTF-8"
        response.writer.write("""{"success":false,"error":"Feil brukernavn eller passord"}""")
    }

    private fun logoutSuccessHandler() = LogoutSuccessHandler { _, response, _ ->
        response.status = 200
        response.contentType = "application/json;charset=UTF-8"
        response.writer.write("""{"success":true}""")
    }
}
