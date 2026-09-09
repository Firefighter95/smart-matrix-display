#pragma once

#include <Arduino.h>

enum class LogCategory : uint8_t { SYSTEM, WIFI, TIME, DISPLAY_LOG, API, OTA, CONFIG };
enum class LogLevel : uint8_t { INFO, WARN, ERROR };

class LogManager {
public:
  static constexpr size_t CAPACITY = 100;

  void begin();
  void add(LogCategory category, LogLevel level, const String& message);
  String toJson() const;

private:
  struct Entry {
    uint32_t timestamp = 0;
    LogCategory category = LogCategory::SYSTEM;
    LogLevel level = LogLevel::INFO;
    String message;
  };
  Entry entries_[CAPACITY];
  size_t count_ = 0;
  size_t next_ = 0;
  const char* categoryName(LogCategory category) const;
  const char* levelName(LogLevel level) const;
};
