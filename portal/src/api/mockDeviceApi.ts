import type {
  ClockConfig,
  DeviceConfig,
  DeviceStatus,
  LogEntry,
  Message,
} from '../../../shared/schemas/models';
import { createDefaultClockElements } from '../../../shared/schemas/models';
import type { DeviceApi, MockDeviceApi, MockScenario } from './deviceApi';

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
  schemaVersion: 1,
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
};

const initialStatus: DeviceStatus = {
  online: true,
  deviceId: 'AABBCCDDEEFF',
  mode: 'CLOCK',
  brightness: 25,
  wifiRssi: -52,
  uptime: 123456,
  timeSynced: true,
  firmware: '1.3.0-dev',
  resolution: '128x64',
  ip: '192.168.1.82',
  hostname: 'smartmatrix',
  heapFree: 182640,
  psramFree: 3920000,
  displayEnabled: true,
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

export class MockDeviceApiImpl implements MockDeviceApi {
  readonly mode = 'mock' as const;
  private config = clone(initialConfig);
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

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private tick() {
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
    if (this.status.mode === 'MESSAGE' && this.status.activeMessage?.createdAt) {
      const elapsed = (Date.now() - Date.parse(this.status.activeMessage.createdAt)) / 1000;
      if (elapsed >= this.status.activeMessage.duration) {
        this.status.mode = 'CLOCK';
        this.status.activeMessage = undefined;
        this.addLog('DISPLAY', 'INFO', 'Bericht verlopen · terug naar klok');
      }
    }
    this.emit();
  }

  async getStatus(): Promise<DeviceStatus> {
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone({
      ...this.status,
      brightness: Math.min(this.config.display.brightness, this.config.display.maxBrightness),
      displayEnabled: this.status.displayEnabled && this.config.display.enabled,
    });
  }

  async getConfig(): Promise<DeviceConfig> {
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone(this.config);
  }

  async updateConfig(patch: Partial<DeviceConfig>): Promise<DeviceConfig> {
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    this.config = {
      ...this.config,
      ...patch,
      display: { ...this.config.display, ...(patch.display ?? {}) },
      clock: { ...this.config.clock, ...(patch.clock ?? {}) },
    };
    this.status.brightness = Math.min(this.config.display.brightness, this.config.display.maxBrightness);
    this.addLog('CONFIG', 'INFO', 'Configuratie opgeslagen in mock NVS');
    return clone(this.config);
  }

  async sendMessage(message: Message): Promise<Message> {
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    window.clearTimeout(this.messageTimeout);
    const activeMessage = clone({ ...message, id: `msg-${Date.now()}`, createdAt: new Date().toISOString() });
    this.status.activeMessage = activeMessage;
    this.status.mode = 'MESSAGE';
    this.addLog('API', 'INFO', `Bericht getoond: ${activeMessage.title || 'zonder titel'}`);
    this.messageTimeout = window.setTimeout(() => this.tick(), message.duration * 1000 + 100);
    return clone(activeMessage);
  }

  async clearDisplay(): Promise<void> {
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    window.clearTimeout(this.messageTimeout);
    this.status.mode = 'CLOCK';
    this.status.activeMessage = undefined;
    this.addLog('DISPLAY', 'INFO', 'Actief bericht gewist');
  }

  async reboot(): Promise<void> {
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
    if (this.scenarios.has('apiError')) throw new Error('Mock API timeout');
    return clone(this.logs);
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
      this.addLog('SYSTEM', 'INFO', `Simulatie hersteld: ${scenario}`);
    }
    this.emit();
  }

  resetMock() {
    this.scenarios.clear();
    this.config = clone(initialConfig);
    this.status = clone(initialStatus);
    this.status.activeMessage = undefined;
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
