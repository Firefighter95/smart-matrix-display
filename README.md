# Smart Matrix Display

Zelfstandige ESP32-S3 HUB75 RGB-matrixcontroller met een lokale adminportal en optionele Home Assistant-integratie. De hardwarebasis voor één P2.5 indoorpaneel van 128×64 pixels is gevalideerd. De productiefase bevat nu een echte klokrenderer, WiFi-provisioning, fallback access point en mDNS; HA, weer en P2000 worden daarop gefaseerd aangesloten.

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

### PlatformIO installeren op Windows

Als `pio` of `python -m platformio` niet werkt, installeer PlatformIO Core eenmalig voor dezelfde Python die je in PowerShell gebruikt:

```powershell
python -m pip install --user -U platformio
python -m platformio --version
```

Gebruik daarna de Python-aanroep hieronder. Het losse `pio`-commando is optioneel en vereist een PATH-instelling. Alternatief kun je PlatformIO IDE voor VS Code gebruiken; daarin is PlatformIO Core ingebouwd.

```powershell
cd firmware
python -m platformio run -e waveshare-esp32-s3-rgb-matrix
python -m platformio run -e hardware-validation
python -m platformio run -t upload
python -m platformio run -t uploadfs
python -m platformio device monitor
```

Het losse `pio`-commando werkt alleen als PlatformIO Core aan de Windows PATH is toegevoegd. De Python-module-aanroep hierboven werkt ook zonder die PATH-instelling. Vanuit de repository-root kan het normale buildscript ook worden gebruikt met `powershell -ExecutionPolicy Bypass -File .\scripts\build-firmware.ps1`.

Voor de eerste fysieke test gebruik je de aparte validation-build:

```powershell
cd firmware
pio run -e hardware-validation
pio run -e hardware-validation -t upload
pio device monitor --baud 115200
```

Deze test is onafhankelijk van portal, LittleFS, WiFi, HA en NTP. De cyclus start met zwart en draait daarna RGB, wit, lijnen, checkerboard, row/column tests, color bars, tekst en bewegende pixel/blok op 15% helderheid. Controleer vóór verdere hardwareafhankelijke firmwareontwikkeling het volledige 128×64 paneel fysiek. Zie [`docs/hardware-validation.md`](docs/hardware-validation.md).

## Productiefirmware flashen

Na de hardwarevalidatie kan de normale firmware plus het portal naar de controller worden geschreven:

```powershell
cd firmware
python -m platformio run -e waveshare-esp32-s3-rgb-matrix -t upload --upload-port COM3
python -m platformio run -e waveshare-esp32-s3-rgb-matrix -t uploadfs --upload-port COM3
python -m platformio device monitor --port COM3 --baud 115200
```

Zonder opgeslagen WiFi-credentials start de controller een tijdelijk access point met een naam zoals `SmartMatrix-99E4`. WiFi-credentials kunnen via `PUT /api/v1/wifi` worden opgeslagen. Na verbinding is de controller bereikbaar via `http://smartmatrix.local` wanneer mDNS door het netwerk wordt ondersteund.

## Hardware

Alle HUB75-pinnen staan centraal in [`firmware/include/hardware_config.h`](firmware/include/hardware_config.h). De defaults volgen de Waveshare ESP32-S3 RGB Matrix voorbeeldpinout en zijn met het MUEN-paneel fysiek gevalideerd. Zie [`docs/hardware.md`](docs/hardware.md) voor voeding, wiring, 1/32 scan en testcyclus.

## API

De versioned basis is `/api/v1/`: status, config, message, events, weer, brightness, power, clear, logs, diagnostics en restart. Het volledige contract staat in [`docs/api.md`](docs/api.md). De portalcomponenten doen geen verspreide `fetch()`-calls; ze gebruiken `DeviceApi`, met `MockDeviceApi` of `Esp32DeviceApi` als adapter.

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

- de production clock is actief; message-, weather- en event-renderers worden nog verder gekoppeld aan de layout/event-engine;
- de firmware gebruikt voorlopig single buffering; dubbele buffering volgt met een expliciete frame-presentatiestap;
- de HACS-integratie en HA-services zijn toegevoegd, maar vereisen de toekomstige productie message-endpoint in de firmware om fysieke berichten te tonen;
- de lokale portal/mock mode is volledig bruikbaar voor UI- en UX-review zonder ESP32.
