FROM maven:3.9-eclipse-temurin-24 AS build
WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
COPY src src
COPY frontend frontend
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:24-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Tuned to fit a 512Mi container: cap heap well below the limit and keep the
# non-heap regions (metaspace, code cache, GC structures, thread stacks) bounded.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=45 \
-XX:+UseSerialGC \
-XX:MaxMetaspaceSize=128m \
-XX:ReservedCodeCacheSize=64m \
-XX:MaxDirectMemorySize=32m \
-Xss512k"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
