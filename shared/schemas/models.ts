export type DisplayMode = 'BOOT' | 'TEST' | 'CLOCK' | 'MESSAGE' | 'WEATHER' | 'OFF';
export type ClockLayout = 'minimal' | 'classic' | 'compact' | 'weather' | 'builder';
export type ClockElementId = 'time' | 'date' | 'temperature' | 'wind' | 'status' | 'fault';
export type MessageAlignment = 'left' | 'center' | 'right';
export type LogCategory = 'SYSTEM' | 'WIFI' | 'TIME' | 'DISPLAY' | 'API' | 'OTA' | 'CONFIG';
export type DeviceFaultCode = 'WIFI_OFFLINE' | 'NTP_UNSYNCED' | 'DISPLAY_OFFLINE' | 'API_UNAVAILABLE';

export interface ClockElement {
  id: ClockElementId;
  enabled: boolean;
  x: number;
  y: number;
  scale: number;
}

export interface DeviceFault {
  code: DeviceFaultCode;
  label: string;
  shortLabel: string;
  severity: 'warning' | 'error';
}

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
  faults?: DeviceFault[];
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
  elements?: ClockElement[];
}

export const createDefaultClockElements = (): ClockElement[] => [
  { id: 'time', enabled: true, x: 32, y: 4, scale: 3 },
  { id: 'date', enabled: true, x: 4, y: 29, scale: 1 },
  { id: 'temperature', enabled: true, x: 4, y: 45, scale: 1 },
  { id: 'wind', enabled: true, x: 61, y: 45, scale: 1 },
  { id: 'status', enabled: true, x: 122, y: 2, scale: 1 },
  { id: 'fault', enabled: true, x: 3, y: 57, scale: 1 },
];

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
