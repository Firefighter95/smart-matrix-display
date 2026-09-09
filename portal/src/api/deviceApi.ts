import type {
  DeviceConfig,
  DeviceStatus,
  LogEntry,
  Message,
} from '../../../shared/schemas/models';

export type MockScenario = 'wifiOffline' | 'ntpError' | 'displayOffline' | 'apiError';

export interface DeviceApi {
  getStatus(): Promise<DeviceStatus>;
  getConfig(): Promise<DeviceConfig>;
  updateConfig(patch: Partial<DeviceConfig>): Promise<DeviceConfig>;
  sendMessage(message: Message): Promise<Message>;
  clearDisplay(): Promise<void>;
  reboot(): Promise<void>;
  getLogs(): Promise<LogEntry[]>;
  subscribe(listener: () => void): () => void;
}

export interface MockDeviceApi extends DeviceApi {
  mode: 'mock';
  setScenario(scenario: MockScenario, enabled: boolean): void;
  resetMock(): void;
}

