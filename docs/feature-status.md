# Feature status

**Laatste inventarisatie:** 11 september 2026  
**Baseline:** `V1.4.0` plus documentatiecommit `9078f67`

Deze pagina is de actuele scopekaart van Smart Matrix Display. Statussen betekenen:

- **DONE** — aanwezig en lokaal/CI aantoonbaar werkend.
- **PARTIAL** — een werkende basis bestaat, maar productie- of architectuurdelen ontbreken.
- **MISSING** — nog niet geïmplementeerd.
- **PLANNED** — bewust doorgeschoven naar een latere fase.

## P0: basisplatform

| Onderdeel | Status | Huidige locatie / bewijs | Ontbrekend of risico |
|---|---|---|---|
| GitHub source of truth | DONE | GitHub repository, `main`, workflows in `.github/workflows/` | Nieuwe wijzigingen blijven per fase committen en pushen |
| Portal lokaal starten | DONE | `portal/`, root `package.json`, Vite | Geen bekende blokkade |
| Portal mock mode | DONE | `portal/src/api/`, `portal/src/mock/` | Simulator kan nog uitgebreider worden voor volledige event-scenario’s |
| Responsive dark portal | DONE | `portal/src/components/`, `portal/src/styles.css` | Builder-UX op mobiel verder verfijnen |
| Gedeelde `MatrixPreview` | DONE | `portal/src/components/MatrixPreview.tsx` | Renderercontract later delen met ESP32 vastleggen |
| Logisch 128×64 canvas | DONE | `portal/src/preview/renderers.ts` | Bounds/clipping nog niet generiek voor alle elementtypes |
| Dashboard | DONE | `portal/src/pages/DashboardPage.tsx` | Queue/current-event informatie ontbreekt nog |
| Display/brightness | PARTIAL | `portal/src/pages/DisplayPage.tsx`, `shared/schemas/models.ts` | Firmwareproductiepad en echte persistentie ontbreken |
| Clock layouts | DONE | `ClockPage.tsx`, `renderers.ts` | Nog geen opgeslagen generieke layouts |
| Weerklok | PARTIAL | `WeatherSnapshot`, `drawClock`, HA-weather push | Alleen actuele snapshot; geen weeralerts/forecast-layouts |
| Handmatige berichten | PARTIAL | `MessagesPage.tsx`, `DeviceApi.sendMessage()` | Firmware message endpoint is nog fase-A placeholder |
| API tester | PARTIAL | `portal/src/pages/ApiPage.tsx` | Event/layout endpoints bestaan nog niet |
| Systeem/logs/OTA UI | PARTIAL | `SystemPage.tsx` | OTA, backup, reset en reboot zijn lokaal/mock of firmware-placeholder |
| Shared schemas | PARTIAL | `shared/schemas/models.ts`, `shared/schemas/*.json` | Layout/Event/Profile/Rule schemas ontbreken nog |
| Config versioning | PARTIAL | `DeviceConfig.schemaVersion`, firmware config manager | Migratiefuncties en volledige runtime-persistentie nog ontbreken |
| Hardware test firmware | DONE | `firmware/src/display_manager.cpp` | Fysiek paneel moet nog door gebruiker worden bevestigd |
| Production HUB75 renderer | MISSING | `firmware/src/display_manager.*` bevat nu testpatronen | Niet bouwen vóór hardwarebevestiging |

## Builder

| Onderdeel | Status | Huidige locatie / bewijs | Ontbrekend of risico |
|---|---|---|---|
| Bestaande builder behouden | DONE | `portal/src/pages/ClockPage.tsx` | Niet vervangen door rewrite |
| Elementen selecteren | DONE | builderlijst en preview-handles | Alleen één element tegelijk |
| Elementen verplaatsen | DONE | drag overlay + X/Y-velden | Geen keyboard-bediening |
| Elementen aan/uit zetten | DONE | `ClockElement.enabled` | Geen generiek elementbeheer |
| Generieke `LayoutModel` | MISSING | Huidig model zit in `DeviceConfig.clock.elements` | Eerst migratielaag toevoegen |
| Element toevoegen/verwijderen | MISSING | — | Nodig voor generieke builder |
| Dupliceren | MISSING | — | — |
| Resize/width/height | MISSING | Alleen eenvoudige `scale` in clockmodel | Bounding boxes en clipping nodig |
| Properties inspector | PARTIAL | enabled, x en y | Naam, tekst, kleur, font, data source, prefix/suffix ontbreken |
| Z-index/align/multi-select | MISSING | — | — |
| Pixelgrid/snap/zoom | MISSING | — | Interne coördinaten moeten 128×64 blijven |
| Keyboard nudging/accessibility | MISSING | — | Pijltjestoetsen en focus states toevoegen |
| Import/export en migratie | MISSING | — | JSON-validatie, preview en bevestiging nodig |
| Templates | MISSING | — | Eerst LayoutModel definiëren |

Zie [`docs/existing-builder.md`](existing-builder.md) voor de volledige bestaande-builderinventarisatie.

## Home Assistant / HACS

| Onderdeel | Status | Huidige locatie / bewijs | Ontbrekend of risico |
|---|---|---|---|
| HACS-installatie | DONE | `hacs.json`, `custom_components/smart_matrix_display/` | Repository/domain niet verplaatsen |
| Config flow per display | DONE | `config_flow.py` | Geen automatische discovery |
| Meerdere displays | DONE | device-target services en één config entry per display | Nieuwe event/layout services moeten dezelfde targeting behouden |
| Status polling | DONE | `coordinator.py`, 30 seconden | Later optioneel live updates |
| Status sensors | DONE | `sensor.py` | Active layout/event/queue sensors ontbreken |
| Online/NTP binary sensors | DONE | `binary_sensor.py` | Faultcontract uitbreiden |
| Clear/restart buttons | DONE | `button.py` | Testbutton ontbreekt |
| HA message service | DONE | `services.yaml`, `__init__.py` | Nog legacy message wrapper zonder centrale Event Engine |
| HA weather service | DONE | `weather.py`, `send_weather` | Forecast/alerts ontbreken |
| HA P2000 service | PARTIAL | `send_p2000` | Structured eventvelden, rules en queue ontbreken |
| Layout activeren vanuit HA | MISSING | — | `show_layout`/event wrapper toevoegen |
| Brightness/power entities | MISSING | — | `light`, `number` of `switch` toevoegen zonder bestaande IDs te breken |
| Active layout/profile select | MISSING | — | Afhankelijk van Layout/Profile model |
| HA entity data sources | PLANNED | Contract nog niet aanwezig | HA hoort waarden/events naar ESP32 te sturen |

Zie [`docs/existing-hacs.md`](existing-hacs.md) voor protocol- en compatibiliteitsdetails.

## Event-, queue- en layoutarchitectuur

| Onderdeel | Status | Huidige locatie / bewijs | Ontbrekend of risico |
|---|---|---|---|
| Event schema | MISSING | Alleen message/weather payloads bestaan | Versioned `Event` toevoegen |
| Event Engine | MISSING | Geen centrale engine gevonden | Alle bronnen moeten één ingang gebruiken |
| Priority engine | PARTIAL | Message/P2000 priorityvelden bestaan | Geen centrale defaults/configuratie |
| Notification queue | MISSING | Geen centrale queue gevonden | Bounded queue, overflow en history ontwerpen |
| Interruption/resume | MISSING | — | CLOCK → HA → P2000 → resume-scenario testen |
| Rule Engine | MISSING | — | Eerst schema en pure matchingfuncties |
| Profiles | MISSING | — | Normal/Night/Away enz. |
| Idle layout selection | PARTIAL | Clock is huidige idle-ervaring | Opslaan/selecteren van meerdere layouts ontbreekt |
| Idle rotation | MISSING | — | Later, na LayoutModel |
| Generic dynamic variables | MISSING | Renderer gebruikt vaste klokdata | Placeholder/dataSource-contract toevoegen |
| Event history/replay | MISSING | Alleen message history in sessie | Begrensde persistente/mock history |

## P1: architectuur voorbereiden

| Onderdeel | Status | Opmerking |
|---|---|---|
| Versioned LayoutModel | MISSING | Migreren vanuit `ClockConfig.elements` zonder bestaande layouts te verliezen |
| Layout categories | MISSING | Idle, Clock, Message, Alert, P2000, HA, Timer, Weather, System |
| Compact firmware layout model | PLANNED | Pas zinvol nadat browsermodel stabiel is en hardware bevestigd is |
| Structured P2000 eventmodel | PARTIAL | HACS-service kan basisvelden sturen; volledig model ontbreekt |
| P2000 filters/favorites/rules | MISSING | Portal/mock eerst, parser blijft buiten ESP32 |
| Pixel icon library | MISSING | Contract voorbereiden, later editor |
| Multi-page events | MISSING | Queue/eventmodel eerst |
| Server health | MISSING | HA/P2000/weather statuscontract |
| Diagnostics page | PARTIAL | System page toont basisstatus; uitgebreide diagnostiek ontbreekt |
| API tokens/rate limiting | PARTIAL | HACS-tokenheader bestaat; firmware enforcement ontbreekt |
| Config backup/import/reset | PARTIAL | Portal UI/mock aanwezig; volledige firmwareflow ontbreekt |
| Automated domain tests | MISSING | CI doet Ruff/compileall, nog geen HA runtime-tests |
| Builder automated tests | MISSING | Add/move/bounds/migration/render-tests toevoegen |
| Event/queue/rule tests | MISSING | Pure TypeScript tests toevoegen vóór verdere integratie |

## P2: later activeren

- volledige P2000-productiekoppeling en PagerMon-adapter;
- kalender en afspraakdata;
- ambient-light sensor en hybrid brightness;
- custom pixel-icon editor;
- geavanceerde animaties en tekstscrolling;
- multi-panel mapping en grotere matrixformaten;
- WebSocket/SSE live status als polling niet meer volstaat;
- veilige OTA rollback/dual partition verificatie;
- aanwezigheid-, vakantie- en uitgebreide nachtprofielen.

## Eerstvolgende implementatiefase

De eerstvolgende veilige fase is:

1. `LayoutModel`, `LayoutElement` en `dataSource` als shared versioned schema toevoegen.
2. Een migratie schrijven van `ClockConfig.elements` naar het nieuwe model.
3. De huidige klokbuilder op die adapter aansluiten zonder bestaande config te verwijderen.
4. Kleine pure tests toevoegen voor bounds, migratie en dynamic-variable substitution.
5. Daarna pas add/delete/duplicate/resize en import/export in de builder toevoegen.

De Event Engine en ESP32-productierenderer blijven daarna afzonderlijke fasen. De fysieke HUB75-bevestiging blijft een vereiste voordat hardwareafhankelijke rendering wordt uitgebreid.

