package no.isys.wineforall.config

import org.aopalliance.intercept.MethodInterceptor
import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import org.springframework.aop.Advisor
import org.springframework.aop.support.DefaultPointcutAdvisor
import org.springframework.aop.support.annotation.AnnotationMatchingPointcut
import org.springframework.beans.factory.config.BeanDefinition
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Role
import org.springframework.jdbc.support.SQLErrorCodeSQLExceptionTranslator
import org.springframework.stereotype.Repository
import java.sql.SQLException

// Exposed itself is set up by its Spring Boot starter (ExposedAutoConfiguration)
@Configuration
class ExposedConfig {

    // Translates Exposed's exceptions in @Repository beans into Spring's DataAccessException hierarchy, as
    // JdbcTemplate would, so callers can catch e.g. DuplicateKeyException. Spring's own translation for
    // @Repository beans only handles unchecked exceptions, and ExposedSQLException is a checked SQLException.
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    fun exposedExceptionTranslationAdvisor(): Advisor {
        val translator = SQLErrorCodeSQLExceptionTranslator("PostgreSQL")
        val interceptor = MethodInterceptor { invocation ->
            try {
                invocation.proceed()
            } catch (e: ExposedSQLException) {
                throw translator.translate("Exposed", null, e.cause as? SQLException ?: e) ?: e
            }
        }
        return DefaultPointcutAdvisor(AnnotationMatchingPointcut(Repository::class.java, true), interceptor)
    }
}
