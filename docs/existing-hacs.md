# Inventarisatie bestaande Home Assistant / HACS-integratie

**Inventarisatiedatum:** 10 september 2026  
**Repository:** `Firefighter95/smart-matrix-display`  
**Baseline:** `V1.4.0` (`18f6da8`)  
**HACS-domein:** `smart_matrix_display`

## Samenvatting

Er bestaat al een werkende Home Assistant custom integration in dezelfde repository als de firmware en portal. De integratie gebruikt één config entry per fysiek display, praat lokaal via HTTP met het IP-adres/hostname van het display en maakt per display een afzonderlijk Home Assistant-device.

Deze integratie moet behouden blijven. Uitbreidingen naar layouts, generieke events, meerdere displays en P2000 moeten additief worden ontworpen. Bestaande services en `/api/v1/`-endpoints mogen niet zonder migratie of alias worden verwijderd.

## Repository, HACS en manifest

| Onderdeel | Huidige waarde |
|---|---|
| Integratiepad | `custom_components/smart_matrix_display/` |
| HACS metadata | `hacs.json` in repositoryroot |
| Domain | `smart_matrix_display` |
| Integratienaam | Smart Matrix Display |
| Versie | `1.4.0` |
| Config flow | Aanwezig |
| Integratietype | `device` |
| IoT-classificatie | `local_polling` |
| Runtime dependencies | Geen externe Python requirements |
| Documentatie/issues | GitHub-repository en `docs/home-assistant.md` |

De integratie staat nu in dezelfde repository. Verplaatsen naar een nieuwe HACS-repository zou het install path, releaseproces en mogelijk de bestaande config entries beïnvloeden. Dat is daarom geen veilige stille wijziging; behouden in deze repository is voor nu het compatibele uitgangspunt.

## Config flow en meerdere displays

De config flow vraagt:

- IP-adres of hostname
- HTTP-poort, standaard 80
- optionele Smart Matrix API-token
- optionele herkenbare naam
- optionele HA `weather.*` entity

Tijdens configuratie wordt `GET /api/v1/status` gebruikt om het apparaat te testen. De stabiele unieke identificatie komt bij voorkeur uit `device_id` van het display en valt anders terug op de genormaliseerde hostnaam. Daardoor kan een display van IP-adres wisselen zonder dat HA noodzakelijk een nieuw device aanmaakt.

Voor meerdere displays wordt de config flow per fysiek IP/hostname herhaald. Services gebruiken Home Assistant device-targets, zodat één service-call naar één display, meerdere displays of een HA-groep kan worden gericht.

Relevante bestanden:

- `config_flow.py` — toevoegen, herconfigureren en valideren van displays
- `__init__.py` — setup, unload, services en runtimes
- `coordinator.py` — statuspolling met 30 seconden interval
- `api.py` — aiohttp HTTP-client
- `entity.py` — gedeelde device/entity metadata

## API-client en huidig protocol

`api.py` gebruikt een async aiohttp-client met standaard 10 seconden timeout. Als een token is ingesteld, wordt die als `X-Smart-Matrix-Token` meegestuurd. HTTP-statuscodes vanaf 400 worden vertaald naar `SmartMatrixApiError`.

De bestaande client gebruikt deze routes:

| Clientmethode | HTTP-route | Doel |
|---|---|---|
| `async_get_status` | `GET /api/v1/status` | status en device-identiteit |
| `async_get_config` | `GET /api/v1/config` | actuele configuratie |
| `async_send_message` | `POST /api/v1/message` | bericht tonen |
| `async_send_weather` | `PUT /api/v1/weather` | HA-weather snapshot pushen |
| `async_clear_display` | `POST /api/v1/clear` | huidig bericht wissen |
| `async_restart` | `POST /api/v1/restart` | controller herstarten |

Er zijn nog geen HACS-clientmethodes voor `/api/v1/events`, layouts, profiles, rules of queue-status. Er is ook nog geen WebSocket/SSE-client; de integratie is polling-gebaseerd.

## Entities

De huidige integratie maakt minimaal deze entities:

- sensors: mode, brightness, WiFi RSSI, uptime, firmware en resolution
- binary sensors: online en time synchronized
- buttons: clear display en restart

Device registry-identificatie gebruikt `(DOMAIN, stable device_id)`. Het device bevat fabrikant-/modelinformatie voor de ESP32-S3 HUB75-controller, softwareversie uit de status en een configuratie-URL naar de HTTP API.

Er zijn momenteel nog geen afzonderlijke `light`, `number` of `select` entities voor brightness, power, active layout, mode of profile. Die kunnen later worden toegevoegd als nieuwe entities, zonder de bestaande sensor- en button-entity IDs te wijzigen.

## Bestaande services/actions

Gedefinieerd in `services.yaml` en afgehandeld in `__init__.py`:

- `smart_matrix_display.send_message`
- `smart_matrix_display.clear_display`
- `smart_matrix_display.restart`
- `smart_matrix_display.send_weather`
- `smart_matrix_display.send_p2000`

`send_message` ondersteunt title, message, duration, color, alignment en priority. `send_weather` gebruikt standaard de bij het display gekozen HA-weather entity, met een optionele override. `send_p2000` ondersteunt momenteel title, message, location, capcode, duration, color, alignment en priority en vertaalt dit naar het bestaande message-contract.

De P2000-service is daarmee al geschikt om meldingen uit een bestaande HA/PagerMon-automatisering naar meerdere geselecteerde displays te sturen. Een volledig structured P2000-eventmodel met discipline, units, incident-ID, rules en queueing is nog niet actief.

## Weerimplementatie

`weather.py` leest een Home Assistant `weather.*` entity, normaliseert temperatuur naar °C en windsnelheid vanuit de beschikbare eenheid naar km/h in het gedeelde `WeatherSnapshot`-contract. De integratie pusht wijzigingen van de geselecteerde entity automatisch naar het betreffende display; één HA-weather entity kan voor meerdere displays worden gebruikt.

De portal/renderer toont windsnelheid vervolgens in m/s. Forecasts worden niet als gewone weather-state-attributen verondersteld; de huidige implementatie pusht de actuele snapshot. Forecast-layouts en weeralerts kunnen later bovenop de Event Engine worden toegevoegd.

## Compatibiliteit met bestaande installaties

De veilige uitbreidingsregels zijn:

1. Houd domain, integratiepad, config-flowvelden en bestaande entity-platforms intact.
2. Houd bestaande service-namen en payloadvelden geldig.
3. Voeg nieuwe routes/services additief toe, bijvoorbeeld `show_layout`, `show_event`, `set_brightness` en `set_profile`.
4. Behoud de legacy message- en weather-routes zolang oudere firmware in gebruik kan zijn.
5. Laat nieuwe velden optioneel zijn en geef defaults bij ontbrekende velden.
6. Gebruik pas `/api/v2/` voor een werkelijk incompatibel contract.
7. Voeg migraties toe als config entries of opgeslagen layoutverwijzingen veranderen.

De huidige firmware-fase-A ondersteunt de uiteindelijke message- en weather-renderers nog niet volledig. De HA-integratie kan daarom al worden ontwikkeld en getest tegen mock/API-contracten, maar fysieke end-to-end functionaliteit volgt pas nadat de HUB75-panelconfiguratie is bevestigd.

## Voorgestelde koppeling aan de nieuwe architectuur

De HACS-integratie blijft een transport- en HA-device-laag:

```text
HA automation/service
        |
        v
HACS service/action + device target
        |
        v
versioned /api/v1/events (of legacy message wrapper)
        |
        v
Smart Matrix Event Engine -> priority queue -> DisplayManager
```

Voor layoutactivering kunnen nieuwe services een `layout_id`, `duration`, `priority` en `payload` sturen. De bestaande `send_message` en `send_p2000` worden wrappers die dezelfde event-ingang gebruiken. Zo blijven bestaande automations werken terwijl HA later ook opgeslagen layouts en structured P2000-events kan activeren.

Voor toekomstige HA entity data sources kan de portal/layout een `home_assistant` bron opslaan, maar de ESP32 moet niet zelfstandig HA-state ophalen. HA hoort de actuele waarde of een event-payload naar het display te sturen.

## Tests en baseline

De huidige repository heeft geen Home Assistant runtime-test suite met `pytest-homeassistant-custom-component`. De CI valideert nu wel:

- Ruff op `custom_components`
- Python bytecode-compilatie met `compileall`
- JSON/HACS metadata
- de algemene firmware- en portalbuilds

Alle baselinechecks en de GitHub Actions voor commit `18f6da8` slagen. De volgende HACS-fase hoort gerichte tests toe te voegen voor config-flow-validatie, API-fouten, device targeting, weather-normalisatie en servicepayloads.

