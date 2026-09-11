# Software RC testen

Lokale checks:

```powershell
npm install
npm run portal:lint
npm run portal:typecheck
npm run portal:test
npm run portal:build
python -m platformio run
python -m ruff check custom_components
python -m compileall -q custom_components
```

De pure Vitest-suite test layoutvalidatie, klokmigratie, variable fallback, P2000 rules, queue-limieten en het interruption/resume-scenario.

De browser-flow is handmatig testbaar via:

1. `npm run dev`;
2. **Layouts** openen en een layout previewen/importeren/exporteren;
3. **Builder** openen en een element toevoegen, slepen, resizen, dupliceren, verwijderen en opslaan;
4. **Events / P2000** openen;
5. HA-bericht, P2000 preset en burst uitvoeren;
6. history en queue-resultaten controleren.

Deterministische golden-frame tests en een versnelde 24-uurs soak test zijn voorbereid als volgende testfase; fysieke frame-uitvoer blijft hardwareafhankelijk.
