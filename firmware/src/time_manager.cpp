#include "time_manager.h"
#include <time.h>

void TimeManager::begin() {
  setenv("TZ", "CET-1CEST,M3.5.0,M10.5.0/3", 1);
  tzset();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
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
