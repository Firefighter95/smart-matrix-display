#include "log_manager.h"

void LogManager::begin() {
  count_ = 0;
  next_ = 0;
}

void LogManager::add(LogCategory category, LogLevel level, const String& message) {
  Entry& entry = entries_[next_];
  entry.timestamp = millis();
  entry.category = category;
  entry.level = level;
  entry.message = message;
  next_ = (next_ + 1) % CAPACITY;
  if (count_ < CAPACITY) count_++;
}

const char* LogManager::categoryName(LogCategory category) const {
  switch (category) {
    case LogCategory::WIFI: return "WIFI";
    case LogCategory::TIME: return "TIME";
    case LogCategory::DISPLAY_LOG: return "DISPLAY";
    case LogCategory::API: return "API";
    case LogCategory::OTA: return "OTA";
    case LogCategory::CONFIG: return "CONFIG";
    default: return "SYSTEM";
  }
}

const char* LogManager::levelName(LogLevel level) const {
  if (level == LogLevel::WARN) return "WARN";
  if (level == LogLevel::ERROR) return "ERROR";
  return "INFO";
}

String LogManager::toJson() const {
  String result = "[";
  for (size_t offset = 0; offset < count_; offset++) {
    const size_t index = (next_ + CAPACITY - count_ + offset) % CAPACITY;
    if (offset) result += ",";
    result += "{\"uptime\":" + String(entries_[index].timestamp);
    result += ",\"category\":\"" + String(categoryName(entries_[index].category)) + "\"";
    result += ",\"level\":\"" + String(levelName(entries_[index].level)) + "\"";
    result += ",\"message\":\"" + entries_[index].message + "\"}";
  }
  return result + "]";
}
