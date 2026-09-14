# Hardware & HUB75

V1 gebruikt de ontvangen Waveshare ESP32-S3-RGB-Matrix (ESP32-S3-N32R16 / 32 MB Flash / 16 MB PSRAM) met paneel AGSP2.5-260706-5000, 128×64 pixels, 1/32 advertised scan en FM6124HJ-family markings. Gebruik een aparte, voldoende gedimensioneerde 5 V voeding en verbind de GND van de controller met GND van het paneel. Voed het paneel niet via USB of de 5 V-pin van de ESP32.

De officiële Waveshare-documentatie vermeldt voor deze controller HUB75 RGB-matrixgebruik en USB-programmeren/debuggen. De officiële Arduino-pinfile levert de GPIO-defaults hieronder; de paneel-scan, RGB-order en fysieke werking zijn daarmee nog niet bewezen: [Waveshare controllerdocumentatie](https://docs.waveshare.com/ESP32-S3-RGB-Matrix), [officiële Arduino default pins](https://github.com/waveshareteam/ESP32-S3-RGB-Matrix/blob/main/example/arduino_v3.3.7/01_SimpleTestShapes/platforms/esp32s3/esp32s3-default-pins.hpp).

## Pinmapping

Alle pinnen staan uitsluitend in [`firmware/include/hardware_config.h`](../firmware/include/hardware_config.h). De eerste configuratie volgt de pinlijst in de Waveshare ESP32-S3 RGB Matrix Arduino-voorbeelden, maar is niet blind als waarheid aangenomen. Controleer de silkscreen, de controllerrevisie en de meegeleverde wiring vóór je het paneel aansluit.

| HUB75-signaal | V1 default | Functie |
|---|---:|---|
| R1/G1/B1 | 4 / 5 / 6 | bovenste RGB-data |
| R2/G2/B2 | 7 / 15 / 16 | onderste RGB-data |
| A/B/C/D/E | 18 / 8 / 3 / 42 / 9 | row addressing |
| CLK | 41 | shift clock |
| LAT/STB | 40 | latch |
| OE | 2 | output enable, actief laag |

Een 1/32-scan paneel gebruikt normaal vijf row-addresslijnen, inclusief E. De huidige centrale keuze is `ONE_THIRTY_SECOND_STANDARD` met E=9. `ONE_THIRTY_SECOND_NO_E_EXPERIMENTAL` bestaat alleen als gerichte diagnoseoptie; activeer die pas als de fysieke connector dit vereist. De huidige hardwaretest is expres het stoppunt vóór productie-rendering.

## Driver en timing

De bestaande DMA-library ondersteunt `FM6124`, `FM6126A` en vergelijkbare driverprofielen. De officiële Waveshare Arduino-demo selecteert `FM6126A` en `clkphase=false`; Smart Matrix gebruikt die instelling centraal in `hardware_config.h`. De library voert de FM6124-family initialisatie uit. Bij afwijkend gedrag wordt eerst alleen `SHIFT_DRIVER` (`FM6124` ↔ `FM6126A`) of `SCAN_MODE` aangepast; geen applicatielogica.

## Fase-A testcyclus

Na flashen van de validation environment toont de firmware met 15% helderheid: BLACK, RED, GREEN, BLUE, WHITE, horizontale lijnen, verticale lijnen, checkerboard, row test, column test, color bars, tekst, moving pixel en moving block. De test draait zonder WiFi, portal, HA of NTP.

Bevestig fysiek minstens: volledig 128 pixels breed, volledig 64 pixels hoog, correcte rood/groen/blauw/wit, geen dubbele of ontbrekende rijen, geen ghosting, correcte tekstoriëntatie en vloeiende animatie. Een foto of korte video van het paneel en de controller-wiring is nuttig bij afwijkingen.

## Voeding en USB

Gebruik de YU-0510 5 V / 10 A / 50 W voeding voor het paneel. Verbind paneel en controller volgens de officiële Waveshare voedingstopologie en maak GND gemeenschappelijk. De officiële gebruiksinstructie beschrijft USB als programmeer-/debuginterface en boot mode als: BOOT ingedrukt houden, USB aansluiten, BOOT loslaten; daarna RESET indrukken om de firmware te starten. Gebruik bij voorkeur de controller-USB-C-poort voor flashen en serial; voed het paneel nooit via de pc-USB.
