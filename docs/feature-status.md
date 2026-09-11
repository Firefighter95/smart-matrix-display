# Feature status

**Laatste inventarisatie:** 11 september 2026  
**Baseline:** software-RC-fasen tot en met `728f00e`

Statussen:

- **DONE** — implementatie, relevante lokale checks en documentatie zijn aanwezig.
- **PARTIAL** — basis werkt, maar productie- of UI-delen ontbreken.
- **BLOCKED_HARDWARE** — alleen echte paneelvalidatie/paneelspecifieke timing ontbreekt.
- **PLANNED_LATER** — bewust doorgeschoven.

## P0-basisplatform

| Onderdeel | Status | Code/bewijs | Resterend |
|---|---|---|---|
| GitHub source of truth | DONE | `main`, `.github/workflows/` | Per fase blijven pushen |
| Portal lokaal/mock | DONE | `portal/`, `MockDeviceApi` | 24-uurs soak test |
| Responsive dark UI | DONE | `portal/src/styles.css` | Mobiele builder verder verfijnen |
| Gedeelde 128×64 preview | DONE | `MatrixPreview`, `renderers.ts` | Golden-frame tests |
| Dashboard / display / clock / messages | DONE | `portal/src/pages/` | Embedded runtime endpoints |
| Weerklok | DONE | Weather layout + HA snapshot | Forecasts/alerts later |
| Brightness schedule | PARTIAL | `DisplayPage`, `profiles.ts` | Profile UI en firmwarecontrol |
| Shared schemas | DONE | `shared/schemas/models.ts` + JSON schemas | C++ parser volgt later |
| Config migratie | PARTIAL | `migrateClockToLayout()` | ESP32 Preferences-migraties uitbreiden |
| Hardware test firmware | DONE | `display_manager.cpp` | Paneel fysiek bevestigen |
| Display output HAL | DONE | `display_output.h/.cpp` | Mock niet aan fysieke firmwareloop gekoppeld |
| Production HUB75 renderer | BLOCKED_HARDWARE | HAL is aanwezig, testpatterns actief | Pin/scan/RGB/timing en fysieke framecontrole |

## Builder en layouts

| Onderdeel | Status | Code/bewijs | Resterend |
|---|---|---|---|
| Bestaande klokbuilder behouden | DONE | `ClockPage.tsx` | Legacypad behouden |
| Generiek `LayoutModel` | DONE | `models.ts`, `layout.schema.json` | Firmwareparser |
| Migratie klok → layout | DONE | `migrations.ts` | Migratie op echte opgeslagen configs testen |
| Layout Library | DONE | `LayoutsPage.tsx` | Import confirmation en schemafouten UI |
| Default layouts/templates | DONE | `createDefaultLayouts()` | Meer iconvarianten later |
| Add/select/move/delete/duplicate | DONE | `LayoutBuilderPage.tsx` | Multi-select later |
| Resize/properties/z-index | DONE | Builder inspector | Visuele resize handles |
| Pixelgrid/snap/zoom | DONE | Builder + `MatrixPreview` | Pan/fijnere snap later |
| Keyboard nudging | DONE | Pijltjes/Shift+pijltjes | Volledige focus-audit |
| Import/export | PARTIAL | JSON Library flow | Validatie/confirmation modal |
| Dynamic variables | DONE | `variables.ts` + generic renderer | HA live entity binding |
| Generic renderer | PARTIAL | `drawLayout()` | ESP32-renderer en font parity |

## Event Engine, rules en profiles

| Onderdeel | Status | Code/bewijs | Resterend |
|---|---|---|---|
| Versioned eventschema | DONE | `event.schema.json`, `DisplayEvent` | C++ parser |
| Event Engine | DONE | `portal/src/engine/eventEngine.ts` | Embedded runtime |
| Priority queue | DONE | bounded queue + overflow | Persistente queue niet nodig na reboot |
| Interruption/resume/expiration | DONE | engine + Vitest scenario | Alleen mock/software bewezen |
| Event history | PARTIAL | bounded mock history + Events page | Replay-knop en firmware history |
| Rule Engine | PARTIAL | `rules.ts` + schema + tests | Visuele Rule Builder |
| Rule tester/debugger | PARTIAL | Raw event debugger | Match-resultaten visueel uitbreiden |
| Profiles | PARTIAL | default profiles + brightness resolver | Profile editor en firmware runtime |
| Night/Away behavior | PARTIAL | profile model en sleep helpers | UI/simulator controls |
| Idle rotation | PARTIAL | `idleRotation` model | Simulator clock/time acceleration |

## HACS / Home Assistant

| Onderdeel | Status | Code/bewijs | Resterend |
|---|---|---|---|
| HACS-installatie/config flow | DONE | `custom_components/smart_matrix_display/` | Geen breaking domainwijziging |
| Meerdere displays | DONE | één config entry/device per display | End-to-end echte devices |
| Status/binary/button entities | DONE | `sensor.py`, `binary_sensor.py`, `button.py` | Extra event sensors |
| Brightness/power/layout/profile controls | DONE | `number.py`, `switch.py`, `select.py` | Firmwarecontrolroutes |
| Existing message/weather/P2000 services | DONE | `services.yaml`, `__init__.py` | Structured P2000 uitbreiden |
| `show_layout` / `show_event` | DONE | API-client + services | Firmwareroutes |
| HA event → mock Event Engine | PARTIAL | contract en mock API aanwezig | HACS runtime testomgeving toevoegen |

## P2000, diagnostics en operations

| Onderdeel | Status | Code/bewijs | Resterend |
|---|---|---|---|
| Structured P2000 model | DONE | Events presets, `docs/p2000.md` | PagerMon-adapter |
| P2000 discipline layouts | DONE | default layouts FIRE/AMBULANCE/POLICE/MMT | KNRM/OTHER templates |
| P2000 simulator/burst | DONE | Events page | History replay |
| Logging ringbuffer | PARTIAL | firmware/mock logs | Categorieën uitbreiden in firmware |
| Diagnostics page | PARTIAL | System page + mock diagnostics API | Volledige portalweergave |
| OTA UI | PARTIAL | System page/mock upload state | Firmware validation/rollback |
| Persistence abstraction | PARTIAL | mock localStorage, firmware Preferences | Gedeelde IConfigStore-contracten |
| API token/rate limiting | PARTIAL | HACS tokenheader | Firmware enforcement |
| WiFi reconnect/NTP fallback | PARTIAL | bestaande firmware managers | Fallback AP/mDNS configureren |
| REST API v1 | PARTIAL | bestaande legacy routes + nieuwe clientcontracten | Nieuwe firmware body handlers |

## Enige toegestane hardware-blockers

- exacte HUB75-pinmapping;
- 1/32 scan/addressing en eventuele E-line;
- fysieke RGB-order/orientatie;
- panel-specific driver quirks en timing;
- fysieke brightness/ghosting/framevalidatie;
- echte OTA flash- en langdurige ESP32/WiFi-soaktest.

## Volgende softwarefase

1. Firmware API body handlers en config/layout/event persistence toevoegen.
2. Profile/rule/editor en event replay in portal uitbreiden.
3. Golden-frame, malformed-input en accelerated soak tests toevoegen.
4. RC-artifacts en `v1.0.0-rc.1` workflow voorbereiden.

