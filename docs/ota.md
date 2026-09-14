# OTA-updates via WiFi

De eerste firmware-installatie gebeurt via USB. De huidige hardwaretest-image gebruikte oorspronkelijk een single-slot partitionering; voor echte rollback-veilige netwerkupdates moet de controller éénmalig worden gemigreerd naar de dual-slot partitionering (`ota_0` + `ota_1`). Daarna kunnen de normale firmware en het LittleFS-portal via het netwerk worden bijgewerkt. De update gaat via de lokale HTTP-server op de ingestelde hostname, standaard `smartmatrix.local`.

## Eenmalige OTA-migratie

Sluit de ESP32 nog één keer aan via USB (standaard `COM3`) en voer vanuit de repository-root uit:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\migrate-ota-partitions.ps1 -Port COM3
```

Dit flash’t de nieuwe partition table, firmware en portalbestanden. Preferences/NVS blijft op dezelfde offset staan. Na deze stap hoeft USB alleen nog als recoverymethode te worden gebruikt.

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

`-Filesystem` bouwt eerst de compacte ESP32-portal en uploadt daarna het LittleFS-image via de LAN-OTA-endpoint:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\upload-network.ps1 -Host smartmatrix.local -Filesystem
```

Dit is het netwerkequivalent van de twee USB-uploadstappen. De firmware ontvangt multipart-uploads op `/api/v1/ota/firmware` en `/api/v1/ota/filesystem`, valideert ze met de ESP32 Update-library en reboot daarna automatisch.

## Voorwaarden en herstel

- De controller moet één keer met `migrate-ota-partitions.ps1` naar de dual-slot productiefirmware zijn geflasht.
- De controller moet verbonden zijn met hetzelfde LAN als de computer.
- Controleer eerst `http://smartmatrix.local/api/v1/status` of het IP-adres.
- Tijdens een OTA-update reboot de ESP32 automatisch; geef hem daarna ongeveer 10–20 seconden om WiFi en mDNS opnieuw op te starten.
- De wrapper controleert na de upload automatisch of de controller weer online komt. Een korte HTTP-connection reset tijdens reboot is normaal en wordt door het script afgehandeld.
- OTA wist de Preferences/NVS-configuratie niet.
- Als netwerk-OTA niet bereikbaar is, blijft USB de recoverymethode.

De OTA-poort is niet publiek beveiligd. Gebruik deze alleen op het vertrouwde lokale netwerk; een OTA-password kan later via runtime provisioning worden toegevoegd.
