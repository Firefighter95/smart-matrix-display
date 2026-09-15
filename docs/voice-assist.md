# Voice Assist via Home Assistant

Smart Matrix Display is being prepared as a local Home Assistant Assist
satellite. The Waveshare ESP32-S3-RGB-Matrix board contains two microphones,
an ES7210 microphone codec, an ES8311 speaker codec and an onboard speaker
header. The existing HUB75 display path remains independent from the audio
path.

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

The HACS integration will expose the display as a native Home Assistant
`assist_satellite` entity. This allows the standard Assist Satellite actions
and states to be used:

- `IDLE`
- `LISTENING`
- `PROCESSING`
- `RESPONDING`

The ESP32 firmware will stream 16 kHz, 16-bit microphone audio only while an
Assist session is active and play the returned TTS audio through ES8311. The
HACS integration remains the Home Assistant-side adapter and keeps Home
Assistant credentials out of the ESP32 firmware.

## Rollout

1. Audio hardware validation: detect and initialize ES7210/ES8311, verify both
   microphones and play a local test tone.
2. Push-to-talk Assist session over the local network.
3. Native `assist_satellite` entity, announcements and HA automation actions.
4. Display feedback for listening, processing, responding and audio errors.
5. Optional wake-word detection after the audio path is stable.

Push-to-talk is the first production milestone. Wake-word detection is kept as
a separate step because it requires tuning microphone gain, echo cancellation
and wake-word CPU/memory usage alongside the HUB75 DMA renderer.

## Portal test mode

Start the local portal with `cd portal`, `npm install` and `npm run dev`. Open
**Voice Assist** in the sidebar. In mock mode the following controls are
available without an ESP32:

- **Start luisteren** runs a complete Assist session simulation;
- the live input meter simulates the two-microphone input;
- the transcript and response are shown after processing;
- **Speaker testen** simulates TTS playback;
- the existing development toolbar can still simulate Wi-Fi and API failures.

The mock uses the same `AudioStatus` model and `DeviceApi` methods as the
future ESP32 transport. The current firmware exposes `GET /api/v1/audio` as a
stable capability endpoint and returns an explicit `AUDIO_NOT_READY` response
for action endpoints until the real codec driver is enabled.

## References

- [Waveshare ESP32-S3-RGB-Matrix](https://www.waveshare.com/product/iot-communication/esp32-s3-rgb-matrix.htm)
- [Waveshare board BSP and audio codec setup](https://github.com/waveshareteam/ESP32-S3-RGB-Matrix/tree/main/example/idf_v5.5.2/components/bsp/esp32_s3_matrix)
- [Home Assistant Assist Satellite entity](https://developers.home-assistant.io/docs/core/entity/assist-satellite/)
- [Home Assistant Assist pipelines](https://developers.home-assistant.io/docs/voice/pipelines/)
