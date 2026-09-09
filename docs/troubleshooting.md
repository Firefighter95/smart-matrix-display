# Troubleshooting

## Dubbele of ontbrekende rijen

Controleer eerst `MATRIX_HEIGHT`, `SCAN_ROWS` en de aanwezigheid van E in `hardware_config.h`. Bij 1/32 scan ontbreekt vaak de vijfde addresslijn of is de controller als 1/16 geïnterpreteerd. Test daarna met de horizontale lijnen uit de cyclus.

## Verkeerde kleuren

Controleer de volgorde R1/G1/B1/R2/G2/B2 en de groundverbinding. Een kleur die op een halve display ontbreekt wijst vaak naar een verkeerde upper/lower datalijn.

## Ghosting of flikkeren

Controleer 5 V-voeding, gemeenschappelijke GND, korte signaalkabels en OE/LAT/CLK. Verlaag tijdelijk de klokfrequentie in de centrale hardwareconfiguratie.

## Halve display of verkeerde tekstoriëntatie

Controleer E, row addressing en de exacte scanconfiguratie van het paneel. Ga pas verder met de productie-renderer nadat alle Fase-A patronen volledig correct zijn.

## WiFi / portal

V1 compileert geen credentials in de firmware. Gebruik de portal/mock mode voor UI-ontwikkeling. Een ontbrekend LittleFS-bestand mag alleen de portal onbeschikbaar maken; de HUB75-test blijft zelfstandig flashbaar.

