# Hardware & HUB75

V1 targets één indoor P2.5 RGB HUB75-paneel van 128×64 pixels, 5 V en ongeveer 18 W maximaal. Gebruik een aparte, voldoende gedimensioneerde 5 V voeding en verbind de GND van de ESP32-S3-controller met GND van het paneel. Voed het paneel niet via de 5 V-pin van de ESP32.

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

Een 1/32-scan paneel gebruikt normaal vijf row-addresslijnen, inclusief E. Als jouw board geen E-lijn aanbiedt, wijzig dan niet willekeurig in de driver: pas de centrale config aan en documenteer de alternatieve scanmodus. De huidige hardwaretest is expres het stoppunt vóór productie-rendering.

## Fase-A testcyclus

Na flashen toont de firmware iedere 2,5 seconden: rood, groen, blauw, wit, zwart, horizontale lijnen, verticale lijnen, checkerboard, pixelraster, `SMART MATRIX`, `128 x 64`, RGB-blokken en een bewegend blok.

Bevestig fysiek minstens: volledig 128 pixels breed, volledig 64 pixels hoog, correcte rood/groen/blauw/wit, geen dubbele of ontbrekende rijen, geen ghosting, correcte tekstoriëntatie en vloeiende animatie. Een foto of korte video van het paneel en de controller-wiring is nuttig bij afwijkingen.

