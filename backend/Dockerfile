FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY DHub.slnx .
COPY src/DHub.Domain/DHub.Domain.csproj src/DHub.Domain/
COPY src/DHub.Infrastructure/DHub.Infrastructure.csproj src/DHub.Infrastructure/
COPY src/DHub.Api/DHub.Api.csproj src/DHub.Api/
RUN dotnet restore src/DHub.Api/DHub.Api.csproj

COPY src/ src/
RUN dotnet publish src/DHub.Api/DHub.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app .
ENTRYPOINT ["dotnet", "DHub.Api.dll"]
