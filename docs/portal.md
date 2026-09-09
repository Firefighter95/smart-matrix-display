# Portal development

De portal in `portal/` is dezelfde statische applicatie die later vanuit `firmware/data/` via LittleFS wordt geserveerd. Alleen de API-adapter verschilt.

## Lokaal starten

```powershell
cd portal
npm install
npm run dev
```

Open daarna <http://localhost:5173>. Mock mode is standaard actief. Dezelfde start kan vanaf de repositoryroot met `npm install` en `npm run dev`, of met `powershell -ExecutionPolicy Bypass -File .\scripts\start-portal.ps1`.

## Mock mode

`VITE_API_MODE=mock` gebruikt `MockDeviceApi`. De simulator laat uptime oplopen, laat RSSI licht variëren, simuleert berichten met een timeout en schrijft acties naar een ringbuffer. De toolbar onderin kan WiFi, NTP, display en API-storingen simuleren.

Voor echte ESP32-requests maak je lokaal `portal/.env` op basis van `.env.example`:

```text
VITE_API_MODE=esp32
VITE_API_BASE_URL=http://smartmatrix.local
```

## ESP32-build

```powershell
npm run portal:build
npm run portal:esp32
```

`npm run build:esp32` bouwt eerst de compacte Vite-productiebuild, kopieert die via een tijdelijke map naar `firmware/data/` en maakt daarnaast gzip-varianten van HTML/CSS/JS/SVG. Bestaande assets worden eerst naar een timestamped backupmap verplaatst en na succes verwijderd. De ESP32 kan de ongecomprimeerde assets direct via LittleFS serveren; gzip is voorbereid voor een latere content-encoding handler.

De build print totale grootte en de grootste bestanden.

