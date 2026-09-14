#pragma once

// Standalone low-level HUB75 diagnostic. This intentionally bypasses the DMA
// display class, DisplayManager, portal and mock output.
void rawSignalTestSetup();
void rawSignalTestLoop();
