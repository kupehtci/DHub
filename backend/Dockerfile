FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Panorama.slnx Directory.Build.props ./
COPY src/Panorama.Domain/Panorama.Domain.csproj src/Panorama.Domain/
COPY src/Panorama.Infrastructure/Panorama.Infrastructure.csproj src/Panorama.Infrastructure/
COPY src/Panorama.Api/Panorama.Api.csproj src/Panorama.Api/
RUN dotnet restore src/Panorama.Api/Panorama.Api.csproj

COPY src/ src/
RUN dotnet publish src/Panorama.Api/Panorama.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app .
ENTRYPOINT ["dotnet", "Panorama.Api.dll"]
