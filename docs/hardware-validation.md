# Hardware validation checklist

Deze checklist is bewust nog niet als geslaagd gemarkeerd. De software gebruikt het profiel `UNCONFIRMED_WAVESHARE_DEFAULT` totdat de exacte controllerrevisie en pinmapping zijn bevestigd.

## Voorbereiding

- [ ] Controller exact identificeren
- [ ] 5V-voeding geschikt voor circa 18W controleren
- [ ] GND van voeding en controller verbinden
- [ ] HUB75 16-pin aansluiting controleren
- [ ] Pinmapping controleren tegen de fysieke controller
- [ ] 1/32 scan en A/B/C/D/E-row addressing bevestigen
- [ ] RGB order bevestigen

## Hardware-test

- [ ] RED volledig zichtbaar
- [ ] GREEN volledig zichtbaar
- [ ] BLUE volledig zichtbaar
- [ ] WHITE correct
- [ ] BLACK zonder ghosting
- [ ] horizontale lijnen
- [ ] verticale lijnen
- [ ] checkerboard
- [ ] pixelgrid
- [ ] row/column test
- [ ] SMART MATRIX
- [ ] 128 x 64
- [ ] moving pixel/block
- [ ] geen dubbele rijen
- [ ] geen ontbrekende rijen
- [ ] juiste oriëntatie
- [ ] tekst zonder ghosting

## Na bevestiging

- [ ] `hardware_config.h` exact aanpassen
- [ ] hardwaretest flashen
- [ ] serial output en foto/video bewaren
- [ ] RC firmware flashen
- [ ] portal → fysiek display testen
- [ ] Home Assistant → fysiek display testen
- [ ] P2000 simulator → fysiek display testen
- [ ] echte OTA/WiFi soak test

De standalone testfirmware heeft geen portal nodig. Build en flash:

```powershell
cd firmware
python -m platformio run
python -m platformio run -t upload
python -m platformio device monitor
```
