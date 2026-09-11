import type {
  DeviceConfig,
  DeviceDiagnostics,
  DeviceStatus,
  DisplayEvent,
  DisplayProfile,
  EventHistoryEntry,
  EventInput,
  LayoutModel,
  LogEntry,
  Message,
} from '../../../shared/schemas/models';

export type MockScenario = 'wifiOffline' | 'ntpError' | 'displayOffline' | 'apiError';

export interface DeviceApi {
  getStatus(): Promise<DeviceStatus>;
  getConfig(): Promise<DeviceConfig>;
  updateConfig(patch: Partial<DeviceConfig>): Promise<DeviceConfig>;
  sendMessage(message: Message): Promise<Message>;
  sendEvent(event: EventInput): Promise<DisplayEvent>;
  clearDisplay(): Promise<void>;
  skipEvent(): Promise<void>;
  reboot(): Promise<void>;
  getLogs(): Promise<LogEntry[]>;
  getLayouts(): Promise<LayoutModel[]>;
  saveLayout(layout: LayoutModel): Promise<LayoutModel>;
  deleteLayout(layoutId: string): Promise<void>;
  getEventHistory(): Promise<EventHistoryEntry[]>;
  getProfiles(): Promise<DisplayProfile[]>;
  updateProfile(profile: DisplayProfile): Promise<DisplayProfile>;
  getDiagnostics(): Promise<DeviceDiagnostics>;
  subscribe(listener: () => void): () => void;
}

export interface MockDeviceApi extends DeviceApi {
  mode: 'mock';
  setScenario(scenario: MockScenario, enabled: boolean): void;
  resetMock(): void;
}
