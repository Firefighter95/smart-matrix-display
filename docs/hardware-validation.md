# Hardware validation

Deze ronde valideert uitsluitend de fysieke HUB75-keten. De validation firmware gebruikt geen WiFi, portal, Home Assistant, P2000 of NTP. De normale firmwareomgeving blijft daarnaast beschikbaar en wordt niet door de validation-build vervangen.

## Eenmalige installatie PlatformIO Core

Controleer eerst:

```powershell
python --version
python -m platformio --version
```

Geeft de tweede opdracht `No module named platformio`, installeer PlatformIO Core dan voor deze Python:

```powershell
python -m pip install --user -U platformio
python -m platformio --version
```

Daarna hoeft `pio` niet in PATH te staan; gebruik de `python -m platformio`-commando’s hieronder.

## Hardwareprofiel

- Controller: Waveshare ESP32-S3-RGB-Matrix
- MCU: ESP32-S3-WROOM-2 / ESP32-S3-N32R16
- Panel: MUEN LED MZ-I-P2.5-320x160mm-32S-M
- LED/type: indoor P2.5, SMD2121, full color
- Resolutie: 128×64
- Data-interface: HUB75, 16-pin
- Scan/drive: 1/32 scan, constant current
- Opgegeven paneelvermogen: 25 W bij DC 5 V
- Voeding: YU-0510, 5 V / 10 A / 50 W
- Validation brightness: 15%
- Rotatie: 0°

De GPIO-defaults zijn afkomstig uit het officiële Waveshare Arduino-voorbeeld en staan centraal in `firmware/include/hardware_config.h`:

```text
R1=4   G1=5   B1=6
R2=7   G2=15  B2=16
A=18   B=8    C=3    D=42   E=9
LAT=40 OE=2  CLK=41
```

De actuele softwarekeuzes zijn `SCAN_MODE=ONE_THIRTY_SECOND_STANDARD`, `SHIFT_DRIVER=FM6126A` en `CLOCK_PHASE=false`, overeenkomstig het officiële Waveshare Arduino-demo. Het paneelgedrag moet nog fysiek worden bevestigd.

## Driverdiagnose

Omdat de paneelspecificatie geen exacte shift-driver-IC vermeldt, zijn gecontroleerde A/B-builds beschikbaar. De GPIO-, resolutie- en 1/32-scaninstellingen blijven gelijk; alleen de genoemde driver/timing wijzigt. Flash één profiel tegelijk en noteer het profiel uit de seriële banner.

```powershell
cd firmware
python -m platformio run -e hardware-validation-fm6124 -t upload --upload-port COM3
python -m platformio device monitor --port COM3 --baud 115200
```

Als `FM6124_DIAGNOSTIC` niets toont, test daarna:

```powershell
python -m platformio run -e hardware-validation-shiftreg -t upload --upload-port COM3
python -m platformio run -e hardware-validation-20mhz -t upload --upload-port COM3
```

De bestaande `hardware-validation` blijft de standaard `FM6126A`-test. Wijzig tijdens deze A/B-test geen bekabeling en flash steeds slechts één omgeving tegelijk. Een zichtbaar rood, groen, blauw of wit beeld is al voldoende om een profiel als werkend te markeren.

## Low-level signaaltest zonder DMA of mock

Als alle DMA-profielen zwart blijven, gebruik dan de volledig zelfstandige raw signal probe. Deze firmware gebruikt geen `DisplayManager`, geen mock-output, geen portal en geen DMA-refresh. De HUB75-pinnen worden rechtstreeks met GPIO aangestuurd; de FM6124-familie-initialisatie wordt eveneens rechtstreeks verstuurd.

```powershell
cd firmware
python -m platformio run -e hardware-signal-probe -t upload --upload-port COM3
python -m platformio device monitor --port COM3 --baud 115200
```

Verwachte seriële tekst:

```text
Smart Matrix Raw HUB75 Signal Probe
DMA: bypassed
Mock display: bypassed
[RAW TEST] RED | direct GPIO
```

Het beeld hoort iedere drie seconden rood, groen, blauw en wit te tonen. Als dit profiel wel beeld geeft, zit het probleem in DMA/configuratie. Als ook dit profiel volledig zwart blijft, is de volgende stap een elektrische controle van `CLK`, `LAT`, `OE` en de RGB-data met een logic analyzer of oscilloscoop; de voeding en connector alleen bewijzen dan nog niet dat de signalen op de juiste fysieke HUB75-pinnen aankomen.

## Build en flash op Windows

```powershell
cd firmware
python -m platformio run -e hardware-validation
python -m platformio run -e hardware-validation -t upload
python -m platformio device monitor
```

Het losse `pio`-commando is optioneel. Als PlatformIO aan PATH is toegevoegd, zijn deze verkorte commando’s equivalent:

```powershell
pio run -e hardware-validation
pio run -e hardware-validation -t upload
pio device monitor
```

Of gebruik vanuit de repository-root het PATH-onafhankelijke script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-firmware.ps1 -Validation
powershell -ExecutionPolicy Bypass -File .\scripts\build-firmware.ps1 -Validation -Upload
```

Controleer de poort met:

```powershell
python -m platformio device list
python -m platformio run -e hardware-validation -t upload --upload-port COMx
python -m platformio device monitor --port COMx --baud 115200
```

Wordt de controller niet herkend, volg dan de officiële bootprocedure: houd BOOT ingedrukt, sluit USB aan, laat BOOT los en druk na upload op RESET.

### Herstel bij `do_core_init` / flash-bootloop

Deze controller rapporteert via eFuse 32 MB OPI-flash en 16 MB OPI-PSRAM. De custom boarddefinitie gebruikt daarom het `opi_opi`-geheugenprofiel en bouwt expliciet de OPI-bootloader. Na een oudere build moet de nieuwe bootloader opnieuw worden geflasht:

```powershell
cd firmware
python -m platformio run -e hardware-validation
python -m platformio run -e hardware-validation -t upload --upload-port COM3
python -m platformio device monitor --port COM3 --baud 115200
```

Vervang `COM3` wanneer Windows een andere poort toont. Blijft de controller daarna in een bootloop hangen, wis dan éénmalig de volledige flash en upload opnieuw. Dit wist ook NVS/configuratie en is daarom alleen geschikt voor deze eerste hardwaretest:

```powershell
python -m platformio run -e hardware-validation -t erase --upload-port COM3
python -m platformio run -e hardware-validation -t upload --upload-port COM3
```

De ingebouwde USB-Serial/JTAG-console is voor deze boardconfiguratie ingeschakeld met USB-CDC. De verwachte eerste applicatieregel is `Smart Matrix Hardware Validation`. Verschijnt die niet, rapporteer dan de eerste volledige bootcyclus vanaf `ESP-ROM` tot en met de foutregel.

## Verwachte seriële start

De monitor staat op 115200 baud. Verwacht onder andere:

```text
Smart Matrix Hardware Validation
Firmware: 1.4.0-hwtest
Board: Waveshare ESP32-S3-RGB-Matrix
Resolution: 128x64
Advertised scan: 1/32
Driver: FM6126A_FM6124_FAMILY
Brightness: 15%
[TEST 01] BLACK
```

Daarna volgt de niet-blokkerende cyclus:

1. BLACK
2. RED
3. GREEN
4. BLUE
5. WHITE
6. HORIZONTAL LINES
7. VERTICAL LINES
8. CHECKERBOARD
9. ROW TEST, met `[ROW] 0..63`
10. COLUMN TEST, met `[COLUMN] 0..127`
11. COLOR BARS
12. TEXT TEST
13. MOVING PIXEL langs de volledige rand
14. MOVING BLOCK 4×4

Na test 14 begint de cyclus opnieuw.

## Checklist gebruiker

- [ ] validation firmware geflasht
- [ ] 128 kolommen volledig zichtbaar
- [ ] 64 rijen volledig zichtbaar
- [ ] rood correct
- [ ] groen correct
- [ ] blauw correct
- [ ] wit correct en niet overbelast
- [ ] zwart zonder ghosting/stuck pixels
- [ ] geen dubbele rijen
- [ ] geen ontbrekende rijen
- [ ] geen dubbele kolommen
- [ ] geen ontbrekende kolommen
- [ ] checkerboard correct
- [ ] tekst leesbaar en juist georiënteerd
- [ ] moving pixel bereikt alle vier hoeken
- [ ] moving block loopt vloeiend
- [ ] helderheid blijft veilig laag

## Terugrapportage

Stuur bij voorkeur foto’s van RED, GREEN, BLUE, WHITE, CHECKERBOARD en TEXT TEST. Als de row test afwijkingen toont, stuur een korte video waarop de seriële `[ROW]`-meldingen en het paneel tegelijk zichtbaar zijn.

Bij een fout wijzigen we uitsluitend in deze volgorde: pinmapping → RGB-order → scan/addressing → E-line → driver initialization → panel mapping → timing. Pas na fysieke bevestiging wordt de productie-renderer vrijgegeven.
