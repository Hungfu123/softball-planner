FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY backend/ backend/
COPY frontend/ frontend/
WORKDIR /app/backend
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/backend/target/lineup-planner-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
