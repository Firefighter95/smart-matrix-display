# Home Assistant / HACS

Smart Matrix Display bevat een lokale Home Assistant custom integration die via HACS kan worden geïnstalleerd. De integratie communiceert rechtstreeks met iedere ESP32 over het lokale netwerk via `/api/v1/`.

## Installatie via HACS

1. Open HACS in Home Assistant.
2. Kies **Integrations**.
3. Open het menu rechtsboven en kies **Custom repositories**.
4. Voeg toe:

   ```text
   https://github.com/Firefighter95/smart-matrix-display
   ```

5. Kies type **Integration**.
6. Installeer **Smart Matrix Display** en herstart Home Assistant.
7. Ga naar **Settings → Devices & services → Add integration**.
8. Zoek **Smart Matrix Display**.
9. Vul het IP-adres of de hostnaam, poort en optionele API-token in.
10. Selecteer optioneel jouw bestaande Home Assistant `weather.*`-entity.

Herhaal de configuratiestroom voor ieder display. Elk IP-adres wordt een afzonderlijk Home Assistant-device. Geef bij het toevoegen een herkenbare naam, bijvoorbeeld `Matrix woonkamer`, `Matrix keuken` of `Matrix kantoor`.

## Beschikbare entities

Per display worden status-entiteiten aangemaakt voor:

- online-status;
- NTP/tijdsynchronisatie;
- displaymodus;
- helderheid;
- WiFi RSSI;
- uptime;
- firmwareversie;
- resolutie;
- actieve layout en profiel;
- queue-lengte, heap, PSRAM, hardware-/paneelprofiel, scanrijen en pinmapping;
- IP-adres, hostnaam en display-enabled status;
- actuele weerdata: conditie, temperatuur en windsnelheid in m/s wanneer een `weather.*`-entity is gekoppeld.

Daarnaast zijn knoppen beschikbaar voor **Clear display** en **Restart**.

Voor bediening vanuit het dashboard zijn ook beschikbaar: een brightness-number, een power-switch en select-entiteiten voor het actieve layout en profiel. De layout/profile-selecties gebruiken het gedeelde `/api/v1/`-contract; firmwareondersteuning voor persistente layout/profile-opslag volgt nog.

## Berichten sturen

Gebruik de service `smart_matrix_display.send_message`. Omdat de service een Home Assistant-device-target gebruikt, kun je één display, meerdere displays of een groep selecteren.

Voorbeeld voor één display:

```yaml
action:
  - action: smart_matrix_display.send_message
    target:
      device_id: 0123456789abcdef0123456789abcdef
    data:
      title: WASMACHINE
      message: KLAAR
      duration: 20
      color: "#00FF00"
      alignment: center
      priority: 50
```

Voor meerdere displays voeg je meerdere `device_id`-waarden toe:

```yaml
action:
  - action: smart_matrix_display.send_message
    target:
      device_id:
        - 0123456789abcdef0123456789abcdef
        - fedcba9876543210fedcba9876543210
    data:
      message: Deur staat open
      duration: 15
      color: "#FFAA00"
```

Ook beschikbaar:

- `smart_matrix_display.clear_display`
- `smart_matrix_display.restart`
- `smart_matrix_display.send_weather`
- `smart_matrix_display.send_p2000`
- `smart_matrix_display.send_alert`
- `smart_matrix_display.show_layout`
- `smart_matrix_display.show_event`
- `smart_matrix_display.set_brightness`
- `smart_matrix_display.set_power`
- `smart_matrix_display.set_layout`
- `smart_matrix_display.set_profile`
- `smart_matrix_display.skip_event`

`send_p2000` wordt als structured event met bron `p2000` en type `dispatch` verstuurd. Daardoor blijven discipline-, straat-, plaats-, regio-, capcode-, units- en incidentgegevens beschikbaar voor regels en layouts. `send_alert` gebruikt dezelfde event-engine met bron `home_assistant` en type `alert`.

## Weer vanuit Home Assistant

De integratie leest geen weerprovider en geen thuisadres zelf uit. Je selecteert tijdens het toevoegen de bestaande HA-weatherentity die al aan jouw thuislocatie gekoppeld is, bijvoorbeeld `weather.home`. Home Assistant weather entities leveren actuele conditie en meetwaarden als state en attributen; de integratie normaliseert temperatuur naar °C en windsnelheid naar km/h voordat het snapshot naar het display wordt gestuurd. [Home Assistant weather entity](https://www.home-assistant.io/integrations/weather)

Bij meerdere displays kun je dezelfde `weather.home`-entity bij ieder display selecteren. Een wijziging in de weatherentity wordt dan naar alle gekoppelde displays doorgestuurd. Je kunt ook handmatig pushen:

```yaml
action:
  - action: smart_matrix_display.send_weather
    target:
      device_id:
        - DISPLAY_DEVICE_ID_1
        - DISPLAY_DEVICE_ID_2
    data:
      weather_entity_id: weather.home
```

Weerforecasten worden in Home Assistant via `weather.get_forecasts` opgehaald en zijn geen gewone state-attributen. De eerste Smart Matrix weather-layout gebruikt daarom de actuele snapshot; forecast-layouts kunnen later worden toegevoegd. [Home Assistant weather forecasts](https://www.home-assistant.io/integrations/weather)

### Controleren welke weerdata aankomt

Open in de browser `http://smartmatrix.local/api/v1/weather` of gebruik in PowerShell:

```powershell
Invoke-RestMethod http://smartmatrix.local/api/v1/weather | ConvertTo-Json
```

Een geslaagde snapshot bevat minimaal `temperatureC` en `condition`, bijvoorbeeld `18.4` en `partlycloudy`; `windSpeedKph` wordt op het display en in Home Assistant als m/s gepresenteerd. In het portal-dashboard verschijnt de kaart **Ontvangen weerdata** met de laatst ontvangen waarden. Zie je `available: false` of `Geen data`, controleer dan de gekozen `weather.*`-entity en voer `smart_matrix_display.send_weather` eenmalig handmatig uit.

## P2000 via Home Assistant

De integratie hoeft niet afhankelijk te zijn van één specifieke P2000/HACS-integratie. Je bestaande P2000-integratie kan een state- of event-trigger gebruiken en daarna `smart_matrix_display.send_p2000` aanroepen.

Voorbeeld als de P2000-integratie een sensor bijwerkt:

```yaml
alias: P2000 naar matrix
triggers:
  - trigger: state
    entity_id: sensor.p2000_melding
conditions:
  - condition: template
    value_template: >-
      {{ trigger.to_state is not none and
         trigger.to_state.state not in ['unknown', 'unavailable', ''] }}
actions:
  - action: smart_matrix_display.send_p2000
    target:
      device_id:
        - DISPLAY_DEVICE_ID_1
        - DISPLAY_DEVICE_ID_2
    data:
      title: P2000
      message: "{{ trigger.to_state.state }}"
      location: "{{ trigger.to_state.attributes.location | default('', true) }}"
      capcode: "{{ trigger.to_state.attributes.capcode | default('', true) }}"
      duration: 30
      color: "#FF3B30"
      priority: 90
```

De exacte entity-ID en attribuutnamen kunnen per P2000-integratie verschillen. Controleer deze in **Settings → Developer tools → States**. De service ondersteunt meerdere device-targets, zodat één melding gelijktijdig naar meerdere matrixdisplays kan worden gestuurd.

## API-token

De config flow accepteert een optionele token en stuurt die als `X-Smart-Matrix-Token`. De ESP32-firmware krijgt hiervoor in de productie-fase een configureerbare tokencontrole. Gebruik geen Home Assistant long-lived access token op de ESP32.

## Meerdere displays

De integratie gebruikt één config entry per fysieke display. De stabiele device-identificatie komt uit de ESP32 `device_id` (eFuse MAC-gebaseerd), niet uit het IP-adres. Daardoor kan een display later naar een ander IP-adres worden verhuisd zonder dat Home Assistant een nieuw device hoeft aan te maken.

## Versie-status

De HACS-integratie en de HA-services staan in GitHub. De actuele firmware ondersteunt de weather-snapshot, weerweergave en controle via `/api/v1/weather`; verdere forecast- en alert-layouts kunnen later via hetzelfde contract worden toegevoegd.
