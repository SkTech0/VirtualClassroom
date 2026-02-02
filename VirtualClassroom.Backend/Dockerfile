# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore VirtualClassroom.sln
WORKDIR "/src/VirtualClassroom.Backend"
RUN dotnet build "VirtualClassroom.Backend.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "VirtualClassroom.Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
EXPOSE 8080

COPY --from=publish /app/publish .
RUN addgroup -S appgroup \
  && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app
USER appuser

ENV ASPNETCORE_ENVIRONMENT=Production
# PORT is set at runtime by Railway; Program.cs configures UseUrls from PORT.

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health > /dev/null || exit 1

ENTRYPOINT ["dotnet", "VirtualClassroom.Backend.dll"]
