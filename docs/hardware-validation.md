# Hardware validation

Deze ronde valideert uitsluitend de fysieke HUB75-keten. De validation firmware gebruikt geen WiFi, portal, Home Assistant, P2000 of NTP. De normale firmwareomgeving blijft daarnaast beschikbaar en wordt niet door de validation-build vervangen.

## Hardwareprofiel

- Controller: Waveshare ESP32-S3-RGB-Matrix
- MCU: ESP32-S3-WROOM-2 / ESP32-S3-N32R16
- Panel: AGSP2.5-260706-5000
- Resolutie: 128×64
- Advertised scan: 1/32
- Driver markings: FM6124HJ-family
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

## Build en flash op Windows

```powershell
cd firmware
pio run -e hardware-validation
pio run -e hardware-validation -t upload
pio device monitor
```

Als `pio` niet als commando beschikbaar is:

```powershell
python -m platformio run -e hardware-validation
python -m platformio run -e hardware-validation -t upload
python -m platformio device monitor
```

Controleer de poort met:

```powershell
pio device list
pio run -e hardware-validation -t upload --upload-port COMx
pio device monitor --port COMx --baud 115200
```

Wordt de controller niet herkend, volg dan de officiële bootprocedure: houd BOOT ingedrukt, sluit USB aan, laat BOOT los en druk na upload op RESET.

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
