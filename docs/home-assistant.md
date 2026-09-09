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
- resolutie.

Daarnaast zijn knoppen beschikbaar voor **Clear display** en **Restart**.

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

## API-token

De config flow accepteert een optionele token en stuurt die als `X-Smart-Matrix-Token`. De ESP32-firmware krijgt hiervoor in de productie-fase een configureerbare tokencontrole. Gebruik geen Home Assistant long-lived access token op de ESP32.

## Meerdere displays

De integratie gebruikt één config entry per fysieke display. De stabiele device-identificatie komt uit de ESP32 `device_id` (eFuse MAC-gebaseerd), niet uit het IP-adres. Daardoor kan een display later naar een ander IP-adres worden verhuisd zonder dat Home Assistant een nieuw device hoeft aan te maken.

## Versie-status

De HACS-integratie en het servicecontract zijn nu voorbereid en staan in GitHub. De huidige hardwaretestfirmware bevat nog niet de definitieve message-renderer en WiFi-provisioning. Zodra de HUB75-panelconfiguratie fysiek is bevestigd, worden de firmware message-endpoint en productie-renderer geactiveerd zonder de Home Assistant-integratie te wijzigen.
