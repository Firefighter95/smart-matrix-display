# OTA-updates via WiFi

De eerste firmware-installatie gebeurt via USB. Daarna kan de normale firmware en het LittleFS-portal via het netwerk worden bijgewerkt. De ESP32 gebruikt ArduinoOTA en adverteert de ingestelde hostname, standaard `smartmatrix.local`.

## Firmware uploaden

Vanaf de repository-root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\upload-network.ps1
```

Als mDNS niet resolveert, gebruik het actuele IP-adres:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\upload-network.ps1 -Host 192.168.0.169
```

## Portal / LittleFS uploaden

`-Filesystem` bouwt eerst de compacte ESP32-portal en uploadt daarna het LittleFS-image via OTA:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\upload-network.ps1 -Host smartmatrix.local -Filesystem
```

Dit is het netwerkequivalent van de twee USB-uploadstappen. De losse PlatformIO-targets zijn `upload` voor firmware en `uploadfsota` voor LittleFS.

## Voorwaarden en herstel

- De controller moet al één keer via USB met de productiefirmware zijn geflasht.
- De controller moet verbonden zijn met hetzelfde LAN als de computer.
- Controleer eerst `http://smartmatrix.local/api/v1/status` of het IP-adres.
- Tijdens firmware-OTA reboot de ESP32 automatisch; geef hem daarna ongeveer 10–20 seconden om WiFi en mDNS opnieuw op te starten.
- OTA wist de Preferences/NVS-configuratie niet.
- Als netwerk-OTA niet bereikbaar is, blijft USB de recoverymethode.

De OTA-poort is niet publiek beveiligd. Gebruik deze alleen op het vertrouwde lokale netwerk; een OTA-password kan later via runtime provisioning worden toegevoegd.
