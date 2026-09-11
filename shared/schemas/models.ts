export const MATRIX_WIDTH = 128;
export const MATRIX_HEIGHT = 64;

export type DisplayMode = 'BOOT' | 'TEST' | 'CLOCK' | 'MESSAGE' | 'WEATHER' | 'ALERT' | 'TIMER' | 'OFF' | 'SLEEP';
export type ClockLayout = 'minimal' | 'classic' | 'compact' | 'weather' | 'builder';
export type ClockElementId = 'time' | 'date' | 'temperature' | 'wind' | 'status' | 'fault';
export type MessageAlignment = 'left' | 'center' | 'right';
export type LayoutCategory = 'idle' | 'clock' | 'generic_message' | 'alert' | 'p2000' | 'home_assistant' | 'timer' | 'weather' | 'system';
export type LayoutElementType =
  | 'text' | 'dynamic_text' | 'clock' | 'date' | 'rectangle' | 'filled_rectangle' | 'line'
  | 'icon' | 'pixel_icon' | 'status_indicator' | 'message_title' | 'message_body' | 'timer' | 'progress';
export type LayoutAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type TextOverflow = 'truncate' | 'wrap' | 'page' | 'horizontal_scroll' | 'vertical_page';
export type DataSourceType = 'static' | 'system' | 'event_payload' | 'home_assistant' | 'p2000' | 'weather' | 'timer';
export type EventSource = 'portal' | 'home_assistant' | 'p2000' | 'system' | 'timer' | 'weather' | 'api';
export type EventResult = 'DISPLAYED' | 'QUEUED' | 'INTERRUPTED' | 'RESUMED' | 'EXPIRED' | 'IGNORED' | 'FAILED';
export type ProfileId = 'normal' | 'night' | 'away' | 'demo' | 'fire';
export type BrightnessMode = 'manual' | 'schedule' | 'ambient' | 'hybrid';

export type LogCategory =
  | 'SYSTEM' | 'WIFI' | 'TIME' | 'DISPLAY' | 'RENDER' | 'EVENT' | 'QUEUE' | 'RULE' | 'PROFILE'
  | 'API' | 'HOME_ASSISTANT' | 'P2000' | 'WEATHER' | 'OTA' | 'CONFIG' | 'BUILDER';
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

export interface DataSource {
  type: DataSourceType;
  path?: string;
  entityId?: string;
  fallback?: string;
}

export interface LayoutElement {
  id: string;
  type: LayoutElementType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  opacity?: number;
  text?: string;
  font?: string;
  fontSize?: number;
  scale?: number;
  color?: string;
  backgroundColor?: string;
  align?: LayoutAlignment;
  verticalAlign?: VerticalAlignment;
  dataSource?: DataSource;
  format?: string;
  prefix?: string;
  suffix?: string;
  overflow?: TextOverflow;
  icon?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface LayoutModel {
  schemaVersion: 1;
  id: string;
  name: string;
  category: LayoutCategory;
  width: number;
  height: number;
  elements: LayoutElement[];
  metadata?: {
    description?: string;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
    source?: string;
  };
}

export interface DisplayEvent {
  id: string;
  source: EventSource;
  type: string;
  priority: number;
  layoutId?: string;
  duration: number;
  createdAt: string;
  expiresAt: string;
  interruptible: boolean;
  resumeAllowed: boolean;
  brightnessOverride?: number;
  profileId?: ProfileId;
  payload: Record<string, unknown>;
}

export interface EventInput {
  id?: string;
  source: EventSource;
  type: string;
  priority?: number;
  layoutId?: string;
  duration?: number;
  createdAt?: string;
  expiresAt?: string;
  interruptible?: boolean;
  resumeAllowed?: boolean;
  brightnessOverride?: number;
  profileId?: ProfileId;
  payload?: Record<string, unknown>;
}

export interface EventHistoryEntry {
  event: DisplayEvent;
  result: EventResult;
  timestamp: string;
  detail?: string;
}

export interface RuleCondition {
  field: 'source' | 'type' | 'priority' | 'profile' | 'time' | 'payload';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  path?: string;
  value: string | number | boolean;
  secondValue?: string | number;
}

export interface RuleAction {
  type: 'select_layout' | 'override_priority' | 'override_duration' | 'ignore' | 'brightness_override' | 'select_profile';
  value?: string | number;
}

export interface DisplayRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface IdleRotationItem {
  id: string;
  layoutId: string;
  enabled: boolean;
  duration: number;
  order: number;
}

export interface DisplayProfile {
  id: ProfileId;
  name: string;
  idleLayoutId: string;
  brightness: number;
  maxBrightness: number;
  allowedSources: EventSource[];
  allowedTypes?: string[];
  idleRotation: IdleRotationItem[];
  allowWake: boolean;
  maxEventDuration?: number;
  nightBrightness?: number;
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
  activeLayout?: string;
  profile?: ProfileId;
  queueLength?: number;
  currentEvent?: DisplayEvent;
  activeMessage?: Message;
  weather?: WeatherSnapshot;
  faults?: DeviceFault[];
}

export interface DeviceDiagnostics {
  chip: string;
  cpuMHz: number;
  flashBytes: number;
  psramBytes: number;
  heapFree: number;
  psramFree: number;
  wifiRssi: number;
  reconnects: number;
  ntpLastSync?: string;
  queueLength: number;
  currentEventId?: string;
  renderMs?: number;
  framesPerSecond?: number;
  apiRequests: number;
  errors: number;
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
  brightnessMode?: BrightnessMode;
  displayMode?: 'always_on' | 'manual' | 'schedule';
  sleepStart?: string;
  sleepEnd?: string;
  temporaryBrightness?: number;
}

export interface Message {
  id?: string;
  title: string;
  message: string;
  duration: number;
  color: string;
  alignment: MessageAlignment;
  priority: number;
  layoutId?: string;
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
  schemaVersion: 1 | 2;
  display: DisplayConfig;
  clock: ClockConfig;
  layouts?: LayoutModel[];
  rules?: DisplayRule[];
  profiles?: DisplayProfile[];
  activeLayoutId?: string;
  activeProfileId?: ProfileId;
  idleRotation?: IdleRotationItem[];
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
