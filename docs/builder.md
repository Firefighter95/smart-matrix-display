# Layout Builder

De bestaande klokbuilder is behouden. De generieke editor is bereikbaar via **Layouts → Open builder**.

De editor ondersteunt:

- elementen toevoegen uit het gedeelde elementtypecontract;
- selecteren, slepen en numerieke X/Y-positionering;
- width/height, kleur, tekst, visibility en z-index;
- verwijderen, dupliceren, naar voren/achter;
- pixelgrid en optionele 2-pixel snap;
- zoom 1×, 2×, 4×, 6× en 8×;
- pijltjestoetsen voor 1 pixel en Shift+pijl voor 4 pixels;
- eenvoudige undo/redo;
- opslaan via `DeviceApi`.

De browser gebruikt geen fysieke pixels: interne coördinaten blijven altijd 0..127 en 0..63. De preview gebruikt dezelfde `LayoutModel` en rendererregels als de mock display.

De huidige HTML-overlay toont handles; exacte bounding-box debugging en een volledige multi-select workflow zijn nog vervolgstappen.
