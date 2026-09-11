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
