#include "time_manager.h"
#include <time.h>

void TimeManager::begin() {
  // configTime() with zero offsets resets the ESP32 timezone to UTC. Use the
  // timezone-aware variant so CET/CEST and the Amsterdam DST rules remain
  // active after NTP synchronisation.
  constexpr char AMSTERDAM_TZ[] = "CET-1CEST,M3.5.0,M10.5.0/3";
  configTzTime(AMSTERDAM_TZ, "pool.ntp.org", "time.nist.gov");
}

void TimeManager::update() {
  if (millis() - lastCheckAt_ < 1000) return;
  lastCheckAt_ = millis();
  struct tm localTime;
  if (getLocalTime(&localTime, 10)) synced_ = true;
}

bool TimeManager::localTime(struct tm& result) const {
  if (!synced_) return false;
  const time_t now = time(nullptr);
  if (now < 1700000000) return false;
  localtime_r(&now, &result);
  return true;
}
