# Rule Engine

Rules zijn algemene rules, geen aparte P2000-filterengine. Een rule bevat conditions, actions, `enabled` en `order`.

Ondersteunde conditions:

- source
- event type
- priority groter/kleiner
- actief profile
- payload field equals/contains
- eenvoudige tijdrange

Ondersteunde actions:

- layout kiezen
- priority overschrijven
- duration overschrijven
- event negeren
- brightness override
- profile kiezen

Voorbeeld:

```json
{
  "id": "fire-capcode",
  "name": "Brandweer capcode",
  "enabled": true,
  "order": 10,
  "conditions": [
    { "field": "source", "operator": "equals", "value": "p2000" },
    { "field": "payload", "operator": "contains", "path": "capcodes", "value": "0700370" }
  ],
  "actions": [
    { "type": "select_layout", "value": "p2000-fire" },
    { "type": "override_priority", "value": 100 },
    { "type": "override_duration", "value": 120 }
  ]
}
```

De pure implementatie staat in `portal/src/engine/rules.ts` en is getest met P2000-capcode matching. Een visuele rule-builder is de volgende UI-fase; de raw event debugger is al beschikbaar.
