# Software-architectuur

Smart Matrix gebruikt vier kernobjecten:

```text
Portal / Home Assistant / API / P2000
              |
              v
           Event
              |
         Rule Engine
              |
       Priority Queue
              |
           Profile
              |
           Layout
              |
        Matrix Renderer
              |
          128x64 Frame
              |
       Display Output HAL
          /           \
  MockDisplay     Hub75Display
```

De browser gebruikt `LayoutModel`, `DisplayEvent`, `DisplayRule` en `DisplayProfile` uit `shared/schemas/models.ts`. De mock device gebruikt dezelfde modellen in `portal/src/engine/`. De fysieke firmware heeft inmiddels een `IDisplayOutput`-grens; de uiteindelijke layout-runtime kan daardoor worden toegevoegd zonder API- of Event Engine-code aan de HUB75-library te koppelen.

## Softwaregrenzen

- `DeviceApi` is de enige portalgrens naar een device.
- `MockDeviceApi` simuleert uptime, status, configuratie, events, queue, history en persistence.
- `Esp32DeviceApi` gebruikt dezelfde methoden en versioned `/api/v1/`-routes.
- `EventEngine` is hardware-onafhankelijk en beheert priority, queue, expiration, interruption en resume.
- `MatrixPreview` blijft één gedeelde previewcomponent.
- `IDisplayOutput` is de firmwaregrens tussen frames/draw commands en HUB75.

## Hardwarestatus

De Waveshare-profielwaarden staan centraal in `firmware/include/hardware_config.h`, maar hebben de identifier `UNCONFIRMED_WAVESHARE_DEFAULT`. Alleen de laatste outputlaag en paneelspecifieke timing/scanmapping zijn daarom nog `BLOCKED_HARDWARE`.
