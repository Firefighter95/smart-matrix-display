# REST API v1

Base path: `/api/v1/`. JSON-velden blijven backward compatible; nieuwe velden zijn optioneel/defaultable.

## Status

`GET /api/v1/status` → `200 OK`

```json
{
  "online": true,
  "device_id": "AABBCCDDEEFF",
  "mode": "CLOCK",
  "brightness": 25,
  "wifi_rssi": -52,
  "uptime": 123456,
  "time_synced": true,
  "firmware": "1.2.0-dev",
  "resolution": "128x64",
  "ip": "192.168.1.82",
  "hostname": "smartmatrix",
  "heap_free": 182640,
  "psram_free": 3920000,
  "display_enabled": true
}
```

## Configuratie

`GET /api/v1/config` → volledige config. `PUT /api/v1/config` accepteert een gedeeltelijke update en hoort `200 OK` met de opgeslagen config terug te geven.

## Bericht

`POST /api/v1/message` accepteert `title`, `message`, `duration` in seconden, `color`, `alignment` (`left`, `center`, `right`) en `priority`. Succes geeft `200 OK` en het actieve bericht terug. Ongeldige JSON of velden geeft `400 Bad Request`.

```json
{"title":"WASMACHINE","message":"KLAAR","duration":20,"color":"#00FF00","alignment":"center","priority":50}
```

## Weer

`PUT /api/v1/weather` accepteert een compact Home Assistant-snapshot:

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

De HACS-integratie maakt dit snapshot automatisch uit de geselecteerde `weather.*`-entity. Tijdens de fase-A hardwaretest retourneert het firmwareendpoint nog `501 WEATHER_RENDERER_PENDING`.

De portal-layout `weather` gebruikt `temperatureC` voor de temperatuur en rekent `windSpeedKph` visueel om naar m/s. Het transportcontract blijft km/h; dit voorkomt providerafhankelijke eenheden in de HA-integratie.

## Overige endpoints

- `POST /api/v1/clear` → wis bericht, ga terug naar `CLOCK`.
- `GET /api/v1/logs` → laatste circa 100 logs.
- `POST /api/v1/restart` → `202 Accepted`, device herstart.

`device_id` is een stabiele eFuse-gebaseerde identificatie van de ESP32 en wordt door de Home Assistant-integratie gebruikt als device identifier. Het IP-adres blijft alleen het transportadres.

`PUT /api/v1/weather` accepteert het genormaliseerde `WeatherSnapshot`-contract. De huidige fase-A firmware retourneert hiervoor nog `501 WEATHER_RENDERER_PENDING`; de HACS-integratie kan de bestaande Home Assistant weatherentity al volgen en pushen zodra de productie-renderer actief is.

De portal gebruikt uitsluitend `DeviceApi`; `MockDeviceApi` en `Esp32DeviceApi` houden UI en transport los van elkaar.

## Home Assistant

De optionele HACS-integratie staat in `custom_components/smart_matrix_display/`. Voeg elk display via de config flow toe met IP-adres/hostnaam. De integratie maakt status-entiteiten en de services `smart_matrix_display.send_message`, `smart_matrix_display.send_weather`, `smart_matrix_display.send_p2000`, `smart_matrix_display.clear_display` en `smart_matrix_display.restart` beschikbaar. Zie [`docs/home-assistant.md`](home-assistant.md).
