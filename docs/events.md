# Events en notification queue

Het versioned eventcontract staat in `shared/schemas/event.schema.json`.

Een event bevat minimaal:

```json
{
  "source": "home_assistant",
  "type": "message",
  "priority": 50,
  "layoutId": "generic-message",
  "duration": 15,
  "interruptible": true,
  "resumeAllowed": true,
  "payload": { "title": "WASMACHINE", "message": "KLAAR" }
}
```

`EventEngine` normaliseert ontbrekende velden, valideert duur/prioriteit, voert rules uit en houdt een begrensde queue/history bij. De queue sorteert op hoogste prioriteit en daarna oudste event.

Het softwaretestscenario is:

```text
CLOCK
  -> HA message (50)
  -> P2000 (90)
  -> P2000 expire
  -> HA message RESUMED
  -> HA expire
  -> idle CLOCK
```

De mock portal toont dit onder **Events / P2000**. `POST /api/v1/events` is de toekomstige embedded ingang; bestaande `POST /api/v1/message` blijft als backwards-compatible wrapper bestaan.
