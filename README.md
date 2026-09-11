# Smart Matrix Display

Zelfstandige ESP32-S3 HUB75 RGB-matrixcontroller met een lokale adminportal en optionele Home Assistant-integratie. Release `V1.4.0` richt zich op één P2.5 indoorpaneel van 128×64 pixels, met HA-routing voor weer en P2000 als uitbreidingscontract.

## Eerste milestone

- lokale donkere responsive portal met Dashboard, Display, Klok, Berichten, API en Systeem;
- mock device-simulator met uptime, RSSI, NTP, berichten-timeout, logs en foutscenario's;
- één pixel-perfect gedeelde 128×64 `MatrixPreview` voor dashboard, klok, display en berichten;
- een `Weerklok`-layout met actuele Home Assistant-temperatuur en windsnelheid in m/s;
- gedeelde contracten en JSON-schema's in `shared/schemas/`;
- PlatformIO/Arduino ESP32-S3 firmware scaffold met onafhankelijke Fase-A HUB75-test;
- GitHub Actions voor portal, firmware en tagged release-artifacts.

## Portal lokaal

```powershell
cd portal
npm install
npm run dev
```

Open <http://localhost:5173>. Mock mode staat standaard aan en toont `DEVELOPMENT / MOCK MODE`. Vanaf de root kan ook:

```powershell
npm install
npm run dev
```

of:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-portal.ps1
```

Zie [`docs/portal.md`](docs/portal.md) voor de ESP32-adapter, `.env`-schakeling en asset-build.

Voor Home Assistant-berichten, meerdere displays en de weerklok zie [`docs/home-assistant.md`](docs/home-assistant.md) en [`docs/home-assistant-weather.md`](docs/home-assistant-weather.md). HACS installeert de lokale integratie; ieder display wordt via IP als afzonderlijk HA-device toegevoegd.

De bestaande builder- en HACS-inventarisatie staat in [`docs/existing-builder.md`](docs/existing-builder.md) en [`docs/existing-hacs.md`](docs/existing-hacs.md). Deze documenten vormen het compatibiliteitsuitgangspunt voor de volgende layout- en Event Engine-fasen.

De actuele DONE/PARTIAL/MISSING/PLANNED-overzicht staat in [`docs/feature-status.md`](docs/feature-status.md).

## Portal naar LittleFS

```powershell
npm run portal:build
npm run portal:esp32
```

De tweede opdracht bouwt de productieportal en zet de statische output veilig in `firmware/data/`, inclusief gzip-varianten. Grootte en grootste assets worden geprint.

## Firmware

```powershell
cd firmware
pio run
pio run -t upload
pio run -t uploadfs
pio device monitor
```

De hardwaretest is onafhankelijk van portal en LittleFS. Na flashen verschijnt iedere 2,5 seconden een nieuw testpatroon. Controleer vóór verdere hardwareafhankelijke firmwareontwikkeling het volledige 128×64 paneel fysiek.

## Hardware

Alle HUB75-pinnen staan centraal in [`firmware/include/hardware_config.h`](firmware/include/hardware_config.h). De defaults volgen de Waveshare ESP32-S3 RGB Matrix voorbeeldpinout, maar moeten tegen jouw exacte controllerrevisie worden gecontroleerd. Zie [`docs/hardware.md`](docs/hardware.md) voor voeding, wiring, 1/32 scan, testcyclus en het hardware-stoppunt.

## API

De versioned basis is `/api/v1/`: status, config, message, clear, logs en restart. Het volledige contract staat in [`docs/api.md`](docs/api.md). De portalcomponenten doen geen verspreide `fetch()`-calls; ze gebruiken `DeviceApi`, met `MockDeviceApi` of `Esp32DeviceApi` als adapter.

## Repositorystructuur

```text
firmware/        PlatformIO Arduino firmware + LittleFS data
portal/          lokale Vite/React/TypeScript portal
shared/schemas/   gedeelde TypeScript-modellen en JSON-schema's
custom_components/ Home Assistant custom integration voor HACS
docs/            hardware, API, portal en troubleshooting
scripts/         Windows build/start helpers
.github/         portal, firmware en release workflows
```

## GitHub workflow

Elke push en pull request bouwt portal en firmware. Een `v*.*.*` tag maakt firmware-, filesystem- en portal-artifacts klaar voor een GitHub Release. Commit per fase met kleine commits; gebruik geen credentials in source. Zie `.env.example` voor lokale configuratie.

## Screenshots

Na de eerste lokale review kunnen desktop- en mobiele screenshots onder `docs/screenshots/` worden toegevoegd. De interface is opgebouwd rond centrale CSS-variables in `portal/src/styles.css`, zodat sidebar, spacing, fonts, kleuren en previewgrootte snel iteratief aangepast kunnen worden.

## Bekende beperkingen van V1

- de exacte HUB75 pinmapping en scanmode zijn nog niet fysiek bevestigd;
- firmware production renderer, WiFi provisioning, volledige JSON-body parsing, OTA-uploadhandler en config-import/export volgen na hardwarebevestiging;
- de HACS-integratie en HA-services zijn toegevoegd, maar vereisen de toekomstige productie message-endpoint in de firmware om fysieke berichten te tonen;
- de lokale portal/mock mode is volledig bruikbaar voor UI- en UX-review zonder ESP32.
