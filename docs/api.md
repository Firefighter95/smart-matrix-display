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
  "firmware": "1.0.0-dev",
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

## Overige endpoints

- `POST /api/v1/clear` → wis bericht, ga terug naar `CLOCK`.
- `GET /api/v1/logs` → laatste circa 100 logs.
- `POST /api/v1/restart` → `202 Accepted`, device herstart.

`device_id` is een stabiele eFuse-gebaseerde identificatie van de ESP32 en wordt door de Home Assistant-integratie gebruikt als device identifier. Het IP-adres blijft alleen het transportadres.

`WEATHER` en `WeatherSnapshot` zijn als uitbreidingscontract voorbereid in `shared/schemas/`; het weerendpoint wordt pas na de V1 hardwarebevestiging geactiveerd.

De portal gebruikt uitsluitend `DeviceApi`; `MockDeviceApi` en `Esp32DeviceApi` houden UI en transport los van elkaar.

## Home Assistant

De optionele HACS-integratie staat in `custom_components/smart_matrix_display/`. Voeg elk display via de config flow toe met IP-adres/hostnaam. De integratie maakt status-entiteiten en de services `smart_matrix_display.send_message`, `smart_matrix_display.clear_display` en `smart_matrix_display.restart` beschikbaar. Zie [`docs/home-assistant.md`](home-assistant.md).
