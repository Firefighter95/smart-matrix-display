# Inventarisatie bestaande layout builder

**Inventarisatiedatum:** 10 september 2026  
**Repository:** `Firefighter95/smart-matrix-display`  
**Baseline:** `V1.4.0` (`18f6da8`)  
**Bron:** huidige `main`-branch

## Samenvatting

De repository bevat al een werkende eerste interactieve klokbuilder. Deze builder moet worden hergebruikt en stapsgewijs worden uitgebreid; hij is nog geen volledige generieke layout editor zoals beschreven in de langetermijnarchitectuur.

De bestaande builder is gekoppeld aan `ClockConfig` en werkt met zes vooraf gedefinieerde datablokken:

- tijd
- datum
- temperatuur
- wind
- statusbolletje
- foutmelding

Posities kunnen numeriek worden ingesteld of met de muis op de gedeelde 128×64-preview worden versleept. De builder bewaart wijzigingen via de bestaande `DeviceApi`-configroute. In mock mode worden deze wijzigingen lokaal in de simulator bewaard.

## Techniek en relevante bestanden

| Onderdeel | Huidige implementatie |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Builderpagina | `portal/src/pages/ClockPage.tsx` |
| Previewcomponent | `portal/src/components/MatrixPreview.tsx` |
| Renderers | `portal/src/preview/renderers.ts` |
| Gedeeld model | `shared/schemas/models.ts` |
| JSON-schema | `shared/schemas/device-config.schema.json` |
| Opslag/API | `DeviceApi.updateConfig({ clock })` |
| Logische resolutie | 128×64, integercoördinaten |
| Browser-rendering | native Canvas, `imageSmoothingEnabled=false`, CSS `image-rendering: pixelated` |

Dezelfde `MatrixPreview` wordt al gebruikt op Dashboard, Display, Klok en Berichten. Daarmee is er één bestaand visueel previewpunt dat ook voor de toekomstige Layout Builder, P2000-preview en HA-preview kan worden hergebruikt.

## Huidige functionaliteit

| Functie | Status | Bevinding |
|---|---|---|
| Layout kiezen | Aanwezig | Minimal, Classic, Compact, Weather en Builder |
| Elementen toevoegen | Niet aanwezig | De zes klokelementen worden automatisch aangemaakt |
| Element selecteren | Aanwezig | Via de blokkenlijst of een overlay-handle |
| Element verplaatsen | Aanwezig | Muisdragging en numerieke X/Y-velden |
| Element verwijderen | Niet aanwezig | Alleen uitschakelen is mogelijk |
| Element dupliceren | Niet aanwezig | Geen duplicate-actie |
| Resizen | Niet aanwezig | `scale` bestaat in het model, maar er is geen resize-editor |
| Eigenschappen | Gedeeltelijk | `enabled`, `x`, `y` en `scale` in het model; UI gebruikt nu vooral `enabled`, `x`, `y` |
| Tekst/font/kleur | Niet generiek | Rendering is gekoppeld aan element-ID en klokconfiguratie |
| Z-index/lagen | Niet aanwezig | Geen laagmodel of naar-voren/naar-achter-acties |
| Uitlijnen | Niet aanwezig | Geen align-tools |
| Multi-select | Niet aanwezig | Eén geselecteerd element tegelijk |
| Keyboard nudging | Niet aanwezig | Pijltjestoetsen zijn nog niet gekoppeld |
| Pixelgrid/snap | Niet aanwezig | Posities zijn pixel-based, maar grid en snap ontbreken |
| Builder-zoom | Niet aanwezig | Alleen de algemene CSS-schaal van de preview |
| Import/export | Niet aanwezig | Geen layoutbestand-flow |
| Templates | Niet aanwezig | Geen templatecatalogus of templatebeheer |
| Dynamische databinding | Beperkt | De zes klok-ID’s zijn hard-coded; geen generieke `dataSource` |
| Preview | Aanwezig | Live render op logisch 128×64 canvas |
| API-koppeling | Gedeeltelijk | Mock werkt; firmware `PUT /api/v1/config` is nog een fase-A placeholder |

## Huidig layoutformaat

Het bestaande formaat zit genest in `DeviceConfig.clock`. De relevante vorm is momenteel:

```json
{
  "schemaVersion": 1,
  "clock": {
    "layout": "builder",
    "use24Hour": true,
    "showSeconds": false,
    "showDate": true,
    "timeColor": "#FFFFFF",
    "dateColor": "#70D7F4",
    "dividerColor": "#27344A",
    "backgroundColor": "#05070B",
    "showStatusIndicator": true,
    "timezone": "Europe/Amsterdam",
    "elements": [
      { "id": "time", "enabled": true, "x": 32, "y": 4, "scale": 3 },
      { "id": "date", "enabled": true, "x": 4, "y": 29, "scale": 1 },
      { "id": "temperature", "enabled": true, "x": 4, "y": 45, "scale": 1 },
      { "id": "wind", "enabled": true, "x": 61, "y": 45, "scale": 1 },
      { "id": "status", "enabled": true, "x": 122, "y": 2, "scale": 1 },
      { "id": "fault", "enabled": true, "x": 3, "y": 57, "scale": 1 }
    ]
  }
}
```

Dit is geschikt als compatibiliteitsformaat voor de huidige klok, maar nog niet als algemeen model voor Clock, Weather, HA, P2000, Alert en Generic Message.

## Render- en interactiestroom

```text
ClockConfig.elements
        |
        v
ClockPage ---------------------> DeviceApi.updateConfig()
        |
        v
MatrixPreview + overlay-handles
        |
        v
portal/src/preview/renderers.ts
        |
        v
logisch Canvas 128×64
```

De overlay-handles zijn HTML-elementen bovenop de canvaspreview. De uiteindelijke klokweergave wordt door de gedeelde renderer getekend. De overlay toont nog geen volledige bounding boxes of clippinggebieden; een geselecteerde handle representeert nu een datablok, niet noodzakelijk diens exacte gerenderde afmetingen.

## Hergebruik en migratievoorstel

De volgende uitbreiding moet voortbouwen op de bestaande code:

1. Introduceer een versioned `LayoutModel` met `id`, `name`, `category`, `width`, `height` en generieke `elements`.
2. Behoud `ClockConfig.elements` als legacy lees- en schrijfpad tijdens de migratie.
3. Voeg een expliciete migratiefunctie toe die de bestaande zes `ClockElement`-records omzet naar een `LayoutModel` voor de gekozen kloklayout.
4. Voeg daarna generieke elementtypes en `dataSource` toe, zonder de bestaande element-ID’s te verwijderen.
5. Laat `MatrixPreview` en de browser-renderer dezelfde `LayoutModel` gebruiken; de firmware krijgt later een compacte renderbare representatie.
6. Bewaar rijke editorinformatie in de portal/layout-export, maar houd de firmware-runtime beperkt tot noodzakelijke renderdata.

Bestaande layouts mogen nooit stilzwijgend worden overschreven. Elke migratie moet `schemaVersion` controleren, een nieuwe versie produceren en bij ongeldige invoer een duidelijke fout teruggeven.

## Risico’s en aandachtspunten

- De firmware heeft momenteel alleen de fase-A hardwaretest; de definitieve ESP32-layoutrenderer bestaat nog niet.
- Config-opslag op de firmware is nog niet gekoppeld aan een volledige layout-editor; de bestaande config-update endpoint geeft nog `501`.
- De bitmapfont en renderercases zijn nu beperkt. Tekstmeting, clipping, wrapping en scrolling moeten later expliciet onderdeel van het contract worden.
- De huidige builder biedt geen keyboardtoegang, undo/redo, multi-select of import/export. Deze functies moeten worden toegevoegd zonder de huidige klokblokken te verliezen.
- `scale` is nu een eenvoudige renderparameter en geen generieke breedte/hoogte-eigenschap. Een latere migratie moet dit verschil expliciet behandelen.
- Portal-afgeleide foutkleuren zijn nog niet volledig een firmwarecontract; status/fault-codes moeten in de versioned API worden vastgelegd.

## Tests en baseline

Op de inventarisatiebaseline zijn uitgevoerd:

- `npm run portal:lint`
- `npm run portal:typecheck`
- `npm run portal:build`
- `python -m platformio run` vanuit `firmware/`
- `python -m ruff check custom_components`
- `python -m compileall -q custom_components`
- JSON-validatie van de HACS metadata en firmwareconfiguratieschema’s

Alle checks slagen. Er zijn momenteel nog geen geautomatiseerde builder-unit-tests voor add/move/delete/duplicate, bounds, migratie of preview-rendering. Dat hoort bij de eerstvolgende builderfase.

