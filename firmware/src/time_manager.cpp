#include "time_manager.h"
#include <time.h>

void TimeManager::begin() {
  setenv("TZ", "CET-1CEST,M3.5.0,M10.5.0/3", 1);
  tzset();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void TimeManager::update() {
  struct tm localTime;
  synced_ = getLocalTime(&localTime, 20);
}

