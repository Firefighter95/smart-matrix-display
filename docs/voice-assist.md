# Voice Assist via Home Assistant

The live audio hardware layer is now enabled on the Waveshare
ESP32-S3-RGB-Matrix board. The board contains two microphones, an ES7210
microphone codec, an ES8311 speaker codec and an onboard speaker header. The
existing HUB75 display path remains independent from the audio path.

This milestone validates the codecs, I2S and speaker output on the real device.
The HACS integration now exposes the onboard speaker as a Home Assistant
`media_player` entity. Home Assistant can resolve a TTS media source and route
the resulting announcement to the display.

## Hardware profile

The official Waveshare board mapping used by this project is:

| Signal | GPIO |
| --- | ---: |
| I2C SDA | 47 |
| I2C SCL | 48 |
| I2S BCLK | 43 |
| I2S MCLK | 12 |
| I2S LRCLK/WS | 38 |
| I2S speaker data out | 21 |
| I2S microphone data in | 39 |
| Speaker amplifier enable | 11 |

These values are centralized in `firmware/include/hardware_config.h` and are
not copied into application code. The supplied or equivalent 8 ohm speaker
must be connected to the board's speaker header; do not connect it directly to
an ESP32 GPIO.

## Integration design

The target HACS integration will expose the display as a native Home Assistant
`assist_satellite` entity. This will allow the standard Assist Satellite
actions and states to be used:

- `IDLE`
- `LISTENING`
- `PROCESSING`
- `RESPONDING`

The current announcement transport accepts local HTTP WAV audio (16-bit PCM,
mono or stereo, 8–48 kHz) and plays it through ES8311. The planned Assist
transport will stream 16 kHz, 16-bit microphone audio only while an Assist
session is active and play returned TTS audio through ES8311. The
HACS integration remains the Home Assistant-side adapter and keeps Home
Assistant credentials out of the ESP32 firmware.

## Rollout

1. **Completed:** audio hardware validation detects and initializes
   ES7210/ES8311 and exposes a local input meter plus speaker test.
2. Push-to-talk Assist session over the local network.
3. Native `assist_satellite` entity, wake-word detection and full HA Assist
   conversation transport.
4. Display feedback for listening, processing, responding and audio errors.
5. Wake-word detection, preferably with ESP-SR/WakeNet after the audio path is
   stable and microphone gain/false-wake behavior have been tuned.

Push-to-talk is the first production milestone. Wake-word detection is kept as
a separate step because it requires tuning microphone gain, echo cancellation
and wake-word CPU/memory usage alongside the HUB75 DMA renderer.

## Portal test mode

Start the local portal with `cd portal`, `npm install` and `npm run dev`. Open
**Voice Assist** in the sidebar. In mock mode the following controls are
available without an ESP32:

- **Microfoon testen** starts live microphone capture on the device and shows
  the input level;
- **Speaker testen** plays a short 440 Hz tone on the connected speaker;
- in mock mode, the same controls simulate input, transcript and response;
- the existing development toolbar can still simulate Wi-Fi and API failures.

The live firmware exposes the following stable endpoints:

- `GET /api/v1/audio` — codec detection, microphone level, speaker state and
  transport capability;
- `POST /api/v1/audio/assist/start` — start the local microphone capture test;
- `POST /api/v1/audio/assist/stop` — stop capture;
- `POST /api/v1/audio/test` — play the local speaker test tone;
- `POST /api/v1/audio/play-url` — play a local HTTP WAV announcement;
- `POST /api/v1/audio/playback/stop` — stop current speaker playback.
- `PUT /api/v1/audio/volume` — set and persist speaker volume from 0–100.

The current live response deliberately reports `transport: "none"` and
`wakeWordEngine: "pending_esp_sr"` until the network Assist transport and
wake-word engine are implemented. The portal and HACS integration use the same
`AudioStatus` model and can already monitor and test the real hardware.

## Hardware validation

After a network firmware upload, open `http://smartmatrix.local/#/voice` (or
the device IP) and run **Speaker testen**. Then run **Microfoon testen** and
speak or clap close to the board. The input meter should move. A valid status
response can also be checked from PowerShell:

```powershell
Invoke-RestMethod http://smartmatrix.local/api/v1/audio | ConvertTo-Json
```

The two codecs being detected proves the board wiring and I2C path are alive,
but it does not by itself prove that the microphone signal reaches the I2S
buffer or that the speaker is connected correctly; both need the functional
tests above.

The portal uses a fast audio-status poll while capture is active. Speak or
clap close to the microphones and confirm that `inputLevel` changes; a small
ambient level is expected even in a quiet room.

## Home Assistant announcement

After updating the HACS integration, each display also has a media player,
usually named `media_player.<display>_speaker`. Use Home Assistant's standard
TTS action:

```yaml
action: tts.speak
target:
  entity_id: tts.piper
data:
  media_player_entity_id: media_player.matrix_slaapkamer_speaker
  message: "Attentie, de voordeur is geopend."
  language: nl
```

The exact TTS entity depends on the provider installed in Home Assistant. The
current embedded decoder deliberately accepts WAV PCM over local HTTP. Choose
a TTS provider that returns WAV, keep the display and Home Assistant on the
same LAN, and avoid HTTPS-only media URLs during this first audio phase.
MP3/HTTPS support and the native wake-word/Assist transport remain later
phases.

## References

- [Waveshare ESP32-S3-RGB-Matrix](https://www.waveshare.com/product/iot-communication/esp32-s3-rgb-matrix.htm)
- [Waveshare board BSP and audio codec setup](https://github.com/waveshareteam/ESP32-S3-RGB-Matrix/tree/main/example/idf_v5.5.2/components/bsp/esp32_s3_matrix)
- [Home Assistant Assist Satellite entity](https://developers.home-assistant.io/docs/core/entity/assist-satellite/)
- [Home Assistant Assist pipelines](https://developers.home-assistant.io/docs/voice/pipelines/)
