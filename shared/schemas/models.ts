export type DisplayMode = 'BOOT' | 'TEST' | 'CLOCK' | 'MESSAGE' | 'WEATHER' | 'OFF';
export type ClockLayout = 'minimal' | 'classic' | 'compact' | 'weather';
export type MessageAlignment = 'left' | 'center' | 'right';
export type LogCategory = 'SYSTEM' | 'WIFI' | 'TIME' | 'DISPLAY' | 'API' | 'OTA' | 'CONFIG';

export interface DeviceStatus {
  online: boolean;
  deviceId?: string;
  mode: DisplayMode;
  brightness: number;
  wifiRssi: number;
  uptime: number;
  timeSynced: boolean;
  firmware: string;
  resolution: string;
  ip: string;
  hostname: string;
  heapFree: number;
  psramFree: number;
  displayEnabled: boolean;
  activeMessage?: Message;
  weather?: WeatherSnapshot;
}

export interface ClockConfig {
  layout: ClockLayout;
  use24Hour: boolean;
  showSeconds: boolean;
  showDate: boolean;
  timeColor: string;
  dateColor: string;
  dividerColor: string;
  backgroundColor: string;
  showStatusIndicator: boolean;
  timezone: 'Europe/Amsterdam';
}

export interface BrightnessScheduleEntry {
  id: string;
  time: string;
  brightness: number;
}

export interface DisplayConfig {
  enabled: boolean;
  brightness: number;
  maxBrightness: number;
  nightMode: boolean;
  scheduleEnabled: boolean;
  brightnessSchedule: BrightnessScheduleEntry[];
}

export interface Message {
  id?: string;
  title: string;
  message: string;
  duration: number;
  color: string;
  alignment: MessageAlignment;
  priority: number;
  createdAt?: string;
}

export interface WeatherSnapshot {
  source: 'home_assistant';
  condition: string;
  temperatureC: number;
  apparentTemperatureC?: number;
  humidity?: number;
  precipitationProbability?: number;
  windSpeedKph?: number;
  observedAt: string;
}

export interface DeviceConfig {
  schemaVersion: 1;
  display: DisplayConfig;
  clock: ClockConfig;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}
