# Layouts

Layouts zijn versioned JSON-objecten met altijd een logische resolutie van 128×64. Het contract staat in `shared/schemas/layout.schema.json`.

Elementen gebruiken integer `x`, `y`, `width`, `height` en `zIndex`. Dynamische tekst kan `{{title}}`, `{{message}}`, `{{time}}`, `{{date}}`, `{{priority}}`, `{{source}}`, `{{location}}`, `{{street}}`, `{{place}}`, `{{discipline}}`, `{{units}}`, `{{temperature}}` en `{{entity_state}}` gebruiken.

Default layouts zijn aanwezig voor:

- Clock Minimal, Classic, Compact en Weather
- Generic Message
- Alert
- Doorbell
- P2000 Generic, Brandweer, Ambulance, Politie en Lifeliner/MMT
- Timer
- System message

De bestaande `ClockConfig.elements` worden door `migrateClockToLayout()` naar een generiek layoutmodel gemigreerd. De legacyconfiguratie wordt niet stilzwijgend verwijderd.

## P2000-meldingen op de fysieke matrix

De firmware bevat drie compacte P2000-layouts die direct via de API en de
HACS-service `smart_matrix_display.show_event` gebruikt kunnen worden:

- `p2000-fire-p1`: donkerrode achtergrond en rode rand;
- `p2000-fire-p2`: donkere oranje achtergrond en oranje rand;
- `p2000-generic`: donkere cyaan achtergrond en cyaan rand.

De gegevens worden verdeeld over vaste matrixregels: prioriteit en discipline,
plaats, omschrijving, straat, regio en eenheden. Regels zijn bewust kort omdat
de matrixfont ongeveer 20 tekens per regel kan tonen. Langere teksten kunnen
later met pagina's of scrollen worden uitgebreid.

In het eventcontract gebruikt de firmware `layoutId` (camelCase). De HACS-
service accepteert `layout_id` en zet dit automatisch om, zodat bestaande Home
Assistant-automations compatibel blijven.

Layouts worden op de ESP32 per layout opgeslagen in afzonderlijke NVS-items.
Daarmee worden meerdere layouts niet meer beperkt door één grote NVS-string.
