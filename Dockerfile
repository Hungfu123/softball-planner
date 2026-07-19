# Maven-Basisimage: mvn ist vorinstalliert → kein ./mvnw-Wrapper-Download je Build
# (der schlug bei Netzwerk-Blips fehl und ließ Deploys scheitern).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/ backend/
COPY frontend/ frontend/
WORKDIR /app/backend
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/backend/target/lineup-planner-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
CMD ["java", "-XX:MaxRAMPercentage=75", "-XX:+UseSerialGC", "-jar", "app.jar", "--spring.profiles.active=prod"]
