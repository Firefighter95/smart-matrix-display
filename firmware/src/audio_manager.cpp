#include "audio_manager.h"

#include <cmath>

#include "hardware_config.h"

namespace {
constexpr uint8_t ES8311_ADDRESS = 0x18;
constexpr uint8_t ES7210_ADDRESS = 0x40;
constexpr size_t AUDIO_BUFFER_BYTES = 512;
constexpr uint32_t AUDIO_SAMPLE_RATE = 16000;

// ES7210 register addresses used by the Waveshare/ESP-IDF reference driver.
constexpr uint8_t ES7210_RESET = 0x00;
constexpr uint8_t ES7210_CLOCK_OFF = 0x01;
constexpr uint8_t ES7210_MAINCLK = 0x02;
constexpr uint8_t ES7210_TIME_CONTROL0 = 0x09;
constexpr uint8_t ES7210_TIME_CONTROL1 = 0x0A;
constexpr uint8_t ES7210_SDP_INTERFACE1 = 0x11;
constexpr uint8_t ES7210_SDP_INTERFACE2 = 0x12;
constexpr uint8_t ES7210_ANALOG = 0x40;
constexpr uint8_t ES7210_MIC12_BIAS = 0x41;
constexpr uint8_t ES7210_MIC34_BIAS = 0x42;
constexpr uint8_t ES7210_MIC1_GAIN = 0x43;
constexpr uint8_t ES7210_MIC2_GAIN = 0x44;
constexpr uint8_t ES7210_MIC1_POWER = 0x47;
constexpr uint8_t ES7210_MIC2_POWER = 0x48;
constexpr uint8_t ES7210_MIC12_POWER = 0x4B;
constexpr size_t SPEAKER_TEST_FRAMES = 8000; // 500 ms at 16 kHz
constexpr size_t SPEAKER_TEST_BUFFER_FRAMES = 512;
}

void AudioManager::begin(ConfigManager& config, LogManager& logs) {
  config_ = &config;
  logs_ = &logs;
  error_ = "";
  volume_ = 35;

  pinMode(HardwareConfig::AudioConfig::POWER_AMP_ENABLE_PIN, OUTPUT);
  digitalWrite(HardwareConfig::AudioConfig::POWER_AMP_ENABLE_PIN, LOW);

  if (!Wire.begin(HardwareConfig::AudioConfig::I2C_SDA_PIN,
                  HardwareConfig::AudioConfig::I2C_SCL_PIN, 400000)) {
    setError("I2C-audio initialisatie mislukt");
    return;
  }
  Wire.setTimeOut(20);

  speakerPresent_ = probe(ES8311_ADDRESS);
  microphonePresent_ = probe(ES7210_ADDRESS);
  if (speakerPresent_ && !initEs8311()) speakerPresent_ = false;
  if (microphonePresent_ && !initEs7210()) microphonePresent_ = false;

  if (!speakerPresent_ && !microphonePresent_) {
    setError("ES7210/ES8311 niet gevonden op I2C");
    return;
  }
  if (!initI2s()) return;

  digitalWrite(HardwareConfig::AudioConfig::POWER_AMP_ENABLE_PIN, HIGH);
  initialized_ = true;
  logs_->add(LogCategory::HOME_ASSISTANT, LogLevel::INFO,
             String("Audio hardware actief · ES7210=") + (microphonePresent_ ? "ja" : "nee") +
                 " · ES8311=" + (speakerPresent_ ? "ja" : "nee"));
}

bool AudioManager::probe(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

bool AudioManager::writeCodec(uint8_t address, uint8_t reg, uint8_t value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

uint8_t AudioManager::readCodec(uint8_t address, uint8_t reg) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0;
  if (Wire.requestFrom(static_cast<uint8_t>(address), static_cast<size_t>(1), true) != 1 || !Wire.available()) return 0;
  return Wire.read();
}

bool AudioManager::initEs8311() {
  bool ok = true;
  ok &= writeCodec(ES8311_ADDRESS, 0x00, 0x1F);
  delay(10);
  ok &= writeCodec(ES8311_ADDRESS, 0x00, 0x00);
  ok &= writeCodec(ES8311_ADDRESS, 0x00, 0x80);
  ok &= writeCodec(ES8311_ADDRESS, 0x01, 0x3F);
  uint8_t reg06 = readCodec(ES8311_ADDRESS, 0x06) & ~(1U << 5);
  ok &= writeCodec(ES8311_ADDRESS, 0x06, reg06);
  // 16 kHz / 16-bit, MCLK = 256 * Fs. These values match the ES8311
  // coefficient family used by the Waveshare Arduino reference driver.
  ok &= writeCodec(ES8311_ADDRESS, 0x02, 0x00);
  ok &= writeCodec(ES8311_ADDRESS, 0x03, 0x10);
  // 4.096 MHz MCLK / 16 kHz sample rate: DAC OSR 0x20.
  ok &= writeCodec(ES8311_ADDRESS, 0x04, 0x20);
  ok &= writeCodec(ES8311_ADDRESS, 0x05, 0x00);
  ok &= writeCodec(ES8311_ADDRESS, 0x06, 0x03);
  ok &= writeCodec(ES8311_ADDRESS, 0x07, 0x00);
  ok &= writeCodec(ES8311_ADDRESS, 0x08, 0xFF);
  ok &= writeCodec(ES8311_ADDRESS, 0x09, 0x0C);
  ok &= writeCodec(ES8311_ADDRESS, 0x0A, 0x0C);
  ok &= writeCodec(ES8311_ADDRESS, 0x0D, 0x01);
  ok &= writeCodec(ES8311_ADDRESS, 0x0E, 0x02);
  ok &= writeCodec(ES8311_ADDRESS, 0x12, 0x00);
  ok &= writeCodec(ES8311_ADDRESS, 0x13, 0x10);
  ok &= writeCodec(ES8311_ADDRESS, 0x1C, 0x6A);
  ok &= writeCodec(ES8311_ADDRESS, 0x32, static_cast<uint8_t>((volume_ * 256) / 100));
  ok &= writeCodec(ES8311_ADDRESS, 0x37, 0x08);
  return ok;
}

bool AudioManager::initEs7210() {
  bool ok = true;
  ok &= writeCodec(ES7210_ADDRESS, ES7210_RESET, 0xFF);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_RESET, 0x41);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_CLOCK_OFF, 0x3F);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_TIME_CONTROL0, 0x30);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_TIME_CONTROL1, 0x30);
  ok &= writeCodec(ES7210_ADDRESS, 0x23, 0x2A);
  ok &= writeCodec(ES7210_ADDRESS, 0x22, 0x0A);
  ok &= writeCodec(ES7210_ADDRESS, 0x20, 0x0A);
  ok &= writeCodec(ES7210_ADDRESS, 0x21, 0x2A);
  ok &= writeCodec(ES7210_ADDRESS, 0x08, 0x00); // slave mode
  ok &= writeCodec(ES7210_ADDRESS, ES7210_ANALOG, 0x43);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC12_BIAS, 0x70);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC34_BIAS, 0x70);
  ok &= writeCodec(ES7210_ADDRESS, 0x07, 0x20); // 16 kHz ADC oversampling
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MAINCLK, 0xC1);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_SDP_INTERFACE1, 0x60); // I2S, 16-bit
  ok &= writeCodec(ES7210_ADDRESS, ES7210_SDP_INTERFACE2, 0x00); // stereo mode
  // Enable the clock tree for MIC1 and MIC2. The reset value 0x3F disables
  // every ADC clock; leaving it unchanged makes I2S reads permanently zero.
  ok &= writeCodec(ES7210_ADDRESS, ES7210_CLOCK_OFF, 0x34);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC1_GAIN, 0x1A); // 30 dB + enable
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC2_GAIN, 0x1A);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC1_POWER, 0x08);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC2_POWER, 0x08);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_MIC12_POWER, 0x00);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_CLOCK_OFF, 0x00);
  ok &= writeCodec(ES7210_ADDRESS, 0x06, 0x00);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_ANALOG, 0x43);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_RESET, 0x71);
  ok &= writeCodec(ES7210_ADDRESS, ES7210_RESET, 0x41);
  return ok;
}

bool AudioManager::initI2s() {
  const i2s_config_t i2sConfig = {
      .mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX | I2S_MODE_RX),
      .sample_rate = AUDIO_SAMPLE_RATE,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
      .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
      .communication_format = I2S_COMM_FORMAT_STAND_I2S,
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
      .dma_buf_count = 8,
      .dma_buf_len = 256,
      .use_apll = false,
      .tx_desc_auto_clear = true,
      .fixed_mclk = 0,
      .mclk_multiple = I2S_MCLK_MULTIPLE_DEFAULT,
      .bits_per_chan = I2S_BITS_PER_CHAN_DEFAULT,
  };
  if (i2s_driver_install(I2S_NUM_0, &i2sConfig, 0, nullptr) != ESP_OK) {
    setError("I2S-audio initialisatie mislukt");
    return false;
  }
  const i2s_pin_config_t pinConfig = {
      .mck_io_num = HardwareConfig::AudioConfig::I2S_MCLK_PIN,
      .bck_io_num = HardwareConfig::AudioConfig::I2S_BCLK_PIN,
      .ws_io_num = HardwareConfig::AudioConfig::I2S_LRCLK_PIN,
      .data_out_num = HardwareConfig::AudioConfig::I2S_DOUT_PIN,
      .data_in_num = HardwareConfig::AudioConfig::I2S_DIN_PIN,
  };
  if (i2s_set_pin(I2S_NUM_0, &pinConfig) != ESP_OK) {
    setError("I2S-kanaalconfiguratie mislukt");
    return false;
  }
  i2s_zero_dma_buffer(I2S_NUM_0);
  i2sReady_ = true;
  return true;
}

void AudioManager::update() {
  if (!initialized_ || !i2sReady_ || !microphonePresent_ || !captureActive_) return;
  static uint8_t buffer[AUDIO_BUFFER_BYTES];
  size_t bytes = 0;
  if (i2s_read(I2S_NUM_0, buffer, sizeof(buffer), &bytes, pdMS_TO_TICKS(20)) != ESP_OK) return;
  if (bytes < sizeof(int16_t)) return;
  int32_t peak = 0;
  for (size_t index = 0; index + 1 < bytes; index += 2) {
    const int16_t sample = static_cast<int16_t>(buffer[index] | (buffer[index + 1] << 8));
    peak = max(peak, abs(static_cast<int>(sample)));
  }
  inputLevel_ = static_cast<uint8_t>(min(100L, (peak * 100L) / 32768L));
  lastSampleMs_ = millis();
}

const char* AudioManager::state() const {
  if (playbackActive()) return "RESPONDING";
  return captureActive_ ? "LISTENING" : "IDLE";
}

bool AudioManager::startAssist() {
  if (!available()) return false;
  captureActive_ = true;
  inputLevel_ = 0;
  if (logs_) logs_->add(LogCategory::HOME_ASSISTANT, LogLevel::INFO, "Live microfoon capture gestart");
  return true;
}

bool AudioManager::stopAssist() {
  captureActive_ = false;
  inputLevel_ = 0;
  if (logs_) logs_->add(LogCategory::HOME_ASSISTANT, LogLevel::INFO, "Live microfoon capture gestopt");
  return true;
}

bool AudioManager::speakerTest() {
  if (!initialized_ || !speakerPresent_) return false;
  digitalWrite(HardwareConfig::AudioConfig::POWER_AMP_ENABLE_PIN, HIGH);
  int16_t samples[SPEAKER_TEST_BUFFER_FRAMES * 2];
  size_t totalWritten = 0;
  while (totalWritten < SPEAKER_TEST_FRAMES) {
    const size_t frames = min(SPEAKER_TEST_BUFFER_FRAMES, SPEAKER_TEST_FRAMES - totalWritten);
    for (size_t frame = 0; frame < frames; ++frame) {
      const size_t sampleFrame = totalWritten + frame;
      const int16_t sample = static_cast<int16_t>(
          sin((2.0 * PI * 440.0 * sampleFrame) / AUDIO_SAMPLE_RATE) * 10000.0);
      samples[frame * 2] = sample;
      samples[frame * 2 + 1] = sample;
    }
    size_t written = 0;
    if (i2s_write(I2S_NUM_0, samples, frames * sizeof(samples[0]) * 2, &written,
                  pdMS_TO_TICKS(100)) != ESP_OK) {
      break;
    }
    totalWritten += written / (sizeof(samples[0]) * 2);
  }
  if (totalWritten == SPEAKER_TEST_FRAMES) playbackUntilMs_ = millis() + 500;
  if (logs_) logs_->add(LogCategory::HOME_ASSISTANT,
                        totalWritten == SPEAKER_TEST_FRAMES ? LogLevel::INFO : LogLevel::ERROR,
                        totalWritten == SPEAKER_TEST_FRAMES ? "Speaker-test gestart" : "Speaker-test schrijven mislukt");
  return totalWritten == SPEAKER_TEST_FRAMES;
}

void AudioManager::setError(const String& message) {
  error_ = message;
  if (logs_) logs_->add(LogCategory::HOME_ASSISTANT, LogLevel::ERROR, message);
}

String AudioManager::json() const {
  String result = "{\"available\":" + String(available() ? "true" : "false") +
                  ",\"initialized\":" + String(initialized_ ? "true" : "false") +
                  ",\"microphoneCount\":" + String(microphonePresent_ ? 2 : 0) +
                  ",\"inputCodec\":\"ES7210\",\"outputCodec\":\"ES8311\"";
  result += ",\"speakerConnected\":" + String(speakerPresent_ ? "true" : "false");
  result += ",\"state\":\"" + String(state()) + "\",\"inputLevel\":" + String(inputLevel_);
  result += ",\"volume\":" + String(volume_) + ",\"transport\":\"" + String(transport()) + "\"";
  result += ",\"wakeWordEngine\":\"" + String(wakeWordEngine()) + "\"";
  if (!error_.isEmpty()) result += ",\"error\":\"" + error_ + "\"";
  result += "}";
  return result;
}
