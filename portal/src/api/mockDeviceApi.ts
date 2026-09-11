import type {
  ClockConfig,
  DeviceDiagnostics,
  DeviceConfig,
  DeviceStatus,
  DisplayEvent,
  DisplayProfile,
  EventHistoryEntry,
  EventInput,
  LayoutModel,
  LogEntry,
  Message,
} from '../../../shared/schemas/models';
import { createDefaultClockElements } from '../../../shared/schemas/models';
import type { DeviceApi, MockDeviceApi, MockScenario } from './deviceApi';
import { EventEngine } from '../engine/eventEngine';
import { createDefaultLayouts } from '../engine/layouts';
import { migrateConfigToV2 } from '../engine/migrations';
import { createDefaultProfiles } from '../engine/profiles';

const initialClock: ClockConfig = {
  layout: 'minimal',
  use24Hour: true,
  showSeconds: false,
  showDate: true,
  timeColor: '#f4f7ff',
  dateColor: '#72e6a8',
  dividerColor: '#43506f',
  backgroundColor: '#050915',
  showStatusIndicator: true,
  timezone: 'Europe/Amsterdam',
  elements: createDefaultClockElements(),
};

const initialConfig: DeviceConfig = {
  schemaVersion: 2,
  display: {
    enabled: true,
    brightness: 25,
    maxBrightness: 100,
    nightMode: true,
    scheduleEnabled: true,
    brightnessSchedule: [
      { id: 'morning', time: '07:00', brightness: 45 },
      { id: 'evening', time: '18:00', brightness: 25 },
      { id: 'late', time: '22:00', brightness: 8 },
      { id: 'midnight', time: '00:00', brightness: 2 },
    ],
  },
  clock: initialClock,
  layouts: createDefaultLayouts(),
  rules: [],
  profiles: createDefaultProfiles(),
  activeLayoutId: 'clock-classic',
  activeProfileId: 'normal',
  idleRotation: [],
};

const initialStatus: DeviceStatus = {
  online: true,
  deviceId: 'AABBCCDDEEFF',
  mode: 'CLOCK',
  brightness: 25,
  wifiRssi: -52,
  uptime: 123456,
  timeSynced: true,
  firmware: '1.4.0-dev',
  resolution: '128x64',
  ip: '192.168.1.82',
  hostname: 'smartmatrix',
  heapFree: 182640,
  psramFree: 3920000,
  displayEnabled: true,
  activeLayout: 'clock-classic',
  profile: 'normal',
  queueLength: 0,
  weather: {
    source: 'home_assistant',
    condition: 'partlycloudy',
    temperatureC: 18.4,
    apparentTemperatureC: 17.9,
    humidity: 68,
    windSpeedKph: 12,
    observedAt: new Date().toISOString(),
  },
};

const clone = <T,>(value: T): T => structuredClone(value);
const MOCK_CONFIG_KEY = 'smart-matrix.mock.config.v2';
const readInitialConfig = (): DeviceConfig => {
  try {
    const stored = window.localStorage.getItem(MOCK_CONFIG_KEY);
    if (stored) return migrateConfigToV2(JSON.parse(stored) as DeviceConfig);
  } catch { /* Corrupt local state is intentionally ignored and replaced by defaults. */ }
  return clone(initialConfig);
};

export class MockDeviceApiImpl implements MockDeviceApi {
  readonly mode = 'mock' as const;
  private config = readInitialConfig();
  private status = clone(initialStatus);
  private logs: LogEntry[] = [
    this.log('SYSTEM', 'INFO', 'Mock device simulator gestart'),
    this.log('DISPLAY', 'INFO', 'CLOCK layout actief op 128x64'),
    this.log('WIFI', 'INFO', 'Verbonden met SmartMatrix-Dev'),
    this.log('TIME', 'INFO', 'NTP gesynchroniseerd · Europe/Amsterdam'),
  ];
  private listeners = new Set<() => void>();
  private scenarios = new Set<MockScenario>();
  private startedAt = Date.now() - initialStatus.uptime * 1000;
  private messageTimeout?: number;
  private engine = new EventEngine({ rules: initialConfig.rules });
  private reconnects = 0;
  private apiRequests = 0;
  private apiErrors = 0;
  private tickHandle = window.setInterval(() => this.tick(), 1000);

  private log(category: LogEntry['category'], level: LogEntry['level'], message: string): LogEntry {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
    };
  }

  private addLog(category: LogEntry['category'], level: LogEntry['level'], message: string) {
    this.logs = [this.log(category, level, message), ...this.logs].slice(0, 100);
    this.emit();
  }

  private persistConfig() {
    try { window.localStorage.setItem(MOCK_CONFIG_KEY, JSON.stringify(this.config)); } catch { /* Storage may be unavailable in private mode. */ }
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private tick() {
    this.engine.tick();
    this.status.uptime = Math.floor((Date.now() - this.startedAt) / 1000);
    const drift = Math.round(Math.sin(Date.now() / 12000) * 3);
    this.status.wifiRssi = this.scenarios.has('wifiOffline') ? -92 : -52 + drift;
    this.status.online = !this.scenarios.has('wifiOffline');
    this.status.timeSynced = !this.scenarios.has('ntpError');
    if (this.scenarios.has('displayOffline')) {
      this.status.displayEnabled = false;
    } else {
      this.status.displayEnabled = this.config.display.enabled;
    }
    this.syncEngineStatus();
    this.emit();
  }

  private syncEngineStatus() {
    const current = this.engine.currentEvent;
    this.status.currentEvent = current;
    this.status.queueLength = this.engine.queueLength;
    if (!current) {
      if (this.status.mode !== 'OFF' && this.status.mode !== 'SLEEP') this.status.mode = 'CLOCK';
      this.status.activeMessage = undefined;
      this.status.activeLayout = this.config.activeLayoutId ?? 'clock-classic';
      return;
    }
    this.status.activeLayout = current.layoutId ?? this.config.activeLayoutId ?? 'clock-classic';
    this.status.mode = current.type === 'alert' ? 'ALERT' : current.type === 'timer' ? 'TIMER' : current.source === 'weather' ? 'WEATHER' : current.type === 'message' || current.source === 'p2000' || current.source === 'home_assistant' ? 'MESSAGE' : 'ALERT';
    const payload = current.payload;
    this.status.activeMessage = {
      id: current.id,
      title: String(payload.title ?? ''),
      message: String(payload.message ?? payload.description ?? ''),
      duration: current.duration,
      color: String(payload.color ?? '#72E6A8'),
      alignment: (payload.alignment as Message['alignment']) ?? 'center',
      priority: current.priority,
      layoutId: current.layoutId,
      createdAt: current.createdAt,
    };
  }

  async getStatus(): Promise<DeviceStatus> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone({
      ...this.status,
      brightness: Math.min(this.config.display.brightness, this.config.display.maxBrightness),
      displayEnabled: this.status.displayEnabled && this.config.display.enabled,
    });
  }

  async getConfig(): Promise<DeviceConfig> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone(this.config);
  }

  async updateConfig(patch: Partial<DeviceConfig>): Promise<DeviceConfig> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    this.config = {
      ...this.config,
      ...patch,
      display: { ...this.config.display, ...(patch.display ?? {}) },
      clock: { ...this.config.clock, ...(patch.clock ?? {}) },
    };
    this.config = migrateConfigToV2(this.config);
    this.persistConfig();
    this.status.brightness = Math.min(this.config.display.brightness, this.config.display.maxBrightness);
    this.addLog('CONFIG', 'INFO', 'Configuratie opgeslagen in mock NVS');
    return clone(this.config);
  }

  async sendMessage(message: Message): Promise<Message> {
    const event = await this.sendEvent({ source: 'portal', type: 'message', layoutId: message.layoutId ?? 'generic-message', priority: message.priority, duration: message.duration, payload: { ...message } });
    return {
      ...message,
      id: event.id,
      createdAt: event.createdAt,
    };
  }

  async sendEvent(input: EventInput): Promise<DisplayEvent> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    const result = this.engine.receive(input);
    this.syncEngineStatus();
    this.addLog(result.result === 'QUEUED' ? 'QUEUE' : 'EVENT', result.result === 'FAILED' ? 'ERROR' : 'INFO', `${input.source} event ${result.result.toLowerCase()}: ${input.type}`);
    window.clearTimeout(this.messageTimeout);
    this.messageTimeout = window.setTimeout(() => this.tick(), (input.duration ?? 20) * 1000 + 100);
    if (!result.event) throw new Error('Event genegeerd door rule');
    return clone(result.event);
  }

  async clearDisplay(): Promise<void> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    window.clearTimeout(this.messageTimeout);
    this.engine.clear();
    this.syncEngineStatus();
    this.addLog('DISPLAY', 'INFO', 'Actief bericht gewist');
  }

  async skipEvent(): Promise<void> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    this.engine.skip();
    this.syncEngineStatus();
    this.addLog('QUEUE', 'INFO', 'Actief event overgeslagen');
  }

  async reboot(): Promise<void> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    this.status.mode = 'BOOT';
    this.addLog('SYSTEM', 'WARN', 'Mock reboot gestart');
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    this.startedAt = Date.now();
    this.status.uptime = 0;
    this.status.mode = 'CLOCK';
    this.addLog('SYSTEM', 'INFO', 'Mock device online');
  }

  async getLogs(): Promise<LogEntry[]> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone(this.logs);
  }

  async getLayouts(): Promise<LayoutModel[]> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone(this.config.layouts ?? []);
  }

  async saveLayout(layout: LayoutModel): Promise<LayoutModel> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    this.config.layouts = [...(this.config.layouts ?? []).filter((item) => item.id !== layout.id), clone(layout)];
    this.persistConfig();
    this.addLog('BUILDER', 'INFO', `Layout opgeslagen: ${layout.name}`);
    return clone(layout);
  }

  async deleteLayout(layoutId: string): Promise<void> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    if (layoutId === this.config.activeLayoutId || layoutId === 'clock-main') throw new Error('Actieve layout kan niet worden verwijderd');
    this.config.layouts = (this.config.layouts ?? []).filter((item) => item.id !== layoutId);
    this.persistConfig();
    this.addLog('BUILDER', 'WARN', `Layout verwijderd: ${layoutId}`);
  }

  async getEventHistory(): Promise<EventHistoryEntry[]> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return this.engine.eventHistory;
  }

  async getProfiles(): Promise<DisplayProfile[]> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone(this.config.profiles ?? []);
  }

  async updateProfile(profile: DisplayProfile): Promise<DisplayProfile> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    this.config.profiles = [...(this.config.profiles ?? []).filter((item) => item.id !== profile.id), clone(profile)];
    this.persistConfig();
    this.addLog('PROFILE', 'INFO', `Profiel opgeslagen: ${profile.name}`);
    return clone(profile);
  }

  async getDiagnostics(): Promise<DeviceDiagnostics> {
    this.apiRequests += 1;
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return {
      chip: 'ESP32-S3 (mock)', cpuMHz: 240, flashBytes: 32 * 1024 * 1024, psramBytes: 8 * 1024 * 1024,
      heapFree: this.status.heapFree, psramFree: this.status.psramFree, wifiRssi: this.status.wifiRssi,
      reconnects: this.reconnects, ntpLastSync: this.status.timeSynced ? new Date().toISOString() : undefined,
      queueLength: this.engine.queueLength, currentEventId: this.engine.currentEvent?.id,
      renderMs: 1.2, framesPerSecond: 30, apiRequests: this.apiRequests, errors: this.apiErrors,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setScenario(scenario: MockScenario, enabled: boolean) {
    if (enabled) {
      this.scenarios.add(scenario);
      this.addLog('SYSTEM', 'WARN', `Simulatie actief: ${scenario}`);
    } else {
      this.scenarios.delete(scenario);
      if (scenario === 'wifiOffline') this.reconnects += 1;
      this.addLog('SYSTEM', 'INFO', `Simulatie hersteld: ${scenario}`);
    }
    this.emit();
  }

  resetMock() {
    this.scenarios.clear();
    this.config = clone(initialConfig);
    try { window.localStorage.removeItem(MOCK_CONFIG_KEY); } catch { /* ignore unavailable storage */ }
    this.status = clone(initialStatus);
    this.status.activeMessage = undefined;
    this.status.currentEvent = undefined;
    this.status.queueLength = 0;
    this.engine = new EventEngine({ rules: this.config.rules });
    this.startedAt = Date.now() - initialStatus.uptime * 1000;
    this.addLog('SYSTEM', 'INFO', 'Mock simulator teruggezet naar beginstaat');
  }

  dispose() {
    window.clearInterval(this.tickHandle);
    window.clearTimeout(this.messageTimeout);
  }
}

export const createMockDeviceApi = (): MockDeviceApi => new MockDeviceApiImpl();

export const isMockDeviceApi = (api: DeviceApi): api is MockDeviceApi => api instanceof MockDeviceApiImpl;
