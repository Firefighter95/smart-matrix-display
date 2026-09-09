# Optionele weerweergave via Home Assistant

De voorgestelde route is: een Home Assistant weather entity levert de data, een HA-automation normaliseert die data naar `WeatherSnapshot`, en de ESP32 ontvangt alleen dit compacte snapshot. De firmware hoeft dan geen weerprovider, API-key of Home Assistant-token te beheren.

## Snelste start

Home Assistant heeft een ingebouwde Open-Meteo-integratie die voor een gekozen zone een weather entity met actuele omstandigheden en forecast levert, zonder account of API-key. Een HACS-integratie is dus niet noodzakelijk voor de eerste proof-of-concept. Als je later bijvoorbeeld een lokale of commerciële HACS-weatherintegratie kiest, blijft het contract gelijk zolang die een standaard Home Assistant `weather` entity aanbiedt.

HACS is de distributielaag voor community-integraties; de integratie zelf wordt in `custom_components/` geïnstalleerd en volgt haar eigen configuratie-instructies. Gebruik daarom geen HACS-code in de ESP32-firmware.

## Gepland transport

V1 houdt `/api/v1/` bewust klein. In de WEATHER-uitbreiding voegen we een gevalideerde `PUT /api/v1/weather` toe. Home Assistant stuurt bij een state change en bijvoorbeeld iedere 30 minuten:

```json
{
  "source": "home_assistant",
  "condition": "partlycloudy",
  "temperatureC": 18.4,
  "apparentTemperatureC": 17.9,
  "humidity": 71,
  "precipitationProbability": 20,
  "windSpeedKph": 12,
  "observedAt": "2026-09-10T08:30:00+02:00"
}
```

De ESP32 toont bij verlies van HA de laatst geldige snapshot met een stale-indicator en valt daarna gecontroleerd terug naar CLOCK. Dit blijft niet-blocking en past naast P2000, MQTT en HOME_ASSISTANT als toekomstige providers.

## Forecasts

Voor een dag- of uurprognose moet de HA-automation `weather.get_forecasts` gebruiken; forecastdata is in Home Assistant geen gewoon state-attribuut van de entity. De portal/firmware krijgt daarna alleen de velden die de gekozen layout nodig heeft.

## Beveiliging

De aanbevolen eerste versie is een LAN-only endpoint op de ESP32 met een optionele gedeelde ingest-token, niet een Home Assistant long-lived token in de firmware. Als de ESP32 ooit zelf de HA API gaat pollen, moet dat token via runtime provisioning worden ingevoerd en nooit in GitHub terechtkomen.

