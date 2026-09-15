#pragma once

#include <Arduino.h>
#include <driver/i2s.h>
#include <Wire.h>

#include "config_manager.h"
#include "log_manager.h"

class AudioManager {
public:
  void begin(ConfigManager& config, LogManager& logs);
  void update();

  bool available() const { return initialized_ && microphonePresent_; }
  bool initialized() const { return initialized_; }
  bool microphonePresent() const { return microphonePresent_; }
  bool speakerPresent() const { return speakerPresent_; }
  uint8_t inputLevel() const { return inputLevel_; }
  uint8_t volume() const { return volume_; }
  bool captureActive() const { return captureActive_; }
  bool playbackActive() const { return playbackUntilMs_ > millis(); }
  const char* state() const;
  const char* transport() const { return "none"; }
  const char* wakeWordEngine() const { return "pending_esp_sr"; }
  String error() const { return error_; }

  bool startAssist();
  bool stopAssist();
  bool speakerTest();
  String json() const;

private:
  bool probe(uint8_t address);
  bool writeCodec(uint8_t address, uint8_t reg, uint8_t value);
  uint8_t readCodec(uint8_t address, uint8_t reg);
  bool initEs8311();
  bool initEs7210();
  bool initI2s();
  void setError(const String& message);

  bool i2sReady_ = false;
  ConfigManager* config_ = nullptr;
  LogManager* logs_ = nullptr;
  bool initialized_ = false;
  bool microphonePresent_ = false;
  bool speakerPresent_ = false;
  bool captureActive_ = false;
  uint8_t inputLevel_ = 0;
  uint8_t volume_ = 35;
  uint32_t lastSampleMs_ = 0;
  uint32_t playbackUntilMs_ = 0;
  String error_;
};
