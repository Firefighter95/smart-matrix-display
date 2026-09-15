import type { AudioStatus, ClockConfig, DeviceConfig, DeviceDiagnostics, DeviceFault, DeviceStatus, DisplayConfig, DisplayEvent, DisplayProfile, EventHistoryEntry, EventInput, LayoutModel, LogEntry, Message, WeatherSnapshot } from '../../../shared/schemas/models';
import { createDefaultClockElements } from '../../../shared/schemas/models';
import type { DeviceApi, WifiInfo, WifiUpdate } from './deviceApi';
import { createDefaultLayouts } from '../engine/layouts';
import { createDefaultProfiles } from '../engine/profiles';

type RawRecord = Record<string, unknown>;

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const pick = <T,>(raw: RawRecord, camel: string, snake: string, fallback: T): T =>
  (raw[camel] ?? raw[snake] ?? fallback) as T;

const normalizeStatus = (raw: RawRecord): DeviceStatus => ({
  online: pick(raw, 'online', 'online', true),
  deviceId: pick(raw, 'deviceId', 'device_id', undefined),
  mode: pick(raw, 'mode', 'mode', 'CLOCK'),
  brightness: pick(raw, 'brightness', 'brightness', 0),
  wifiRssi: pick(raw, 'wifiRssi', 'wifi_rssi', 0),
  uptime: pick(raw, 'uptime', 'uptime', 0),
  timeSynced: pick(raw, 'timeSynced', 'time_synced', false),
  firmware: pick(raw, 'firmware', 'firmware', 'unknown'),
  resolution: pick(raw, 'resolution', 'resolution', '128x64'),
  ip: pick(raw, 'ip', 'ip', ''),
  hostname: pick(raw, 'hostname', 'hostname', ''),
  heapFree: pick(raw, 'heapFree', 'heap_free', 0),
  psramFree: pick(raw, 'psramFree', 'psram_free', 0),
  displayEnabled: pick(raw, 'displayEnabled', 'display_enabled', true),
  audio: raw.audio as DeviceStatus['audio'],
  activeMessage: raw.activeMessage as Message | undefined,
  weather: raw.weather as WeatherSnapshot | undefined,
  faults: raw.faults as DeviceFault[] | undefined,
});

const normalizeWifi = (raw: RawRecord): WifiInfo => ({
  connected: pick(raw, 'connected', 'connected', false),
  apMode: pick(raw, 'apMode', 'ap_mode', false),
  apSsid: pick(raw, 'apSsid', 'ap_ssid', ''),
  ssid: pick(raw, 'ssid', 'ssid', ''),
  ip: pick(raw, 'ip', 'ip', ''),
  hostname: pick(raw, 'hostname', 'hostname', ''),
});

const defaultDisplay: DisplayConfig = {
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
};

const defaultClock: ClockConfig = {
  layout: 'minimal',
  use24Hour: true,
  showSeconds: false,
  showDate: true,
  timeColor: '#f4f7ff',
  dateColor: '#72e6a8',
  dividerColor: '#43506f',
  backgroundColor: '#000000',
  showStatusIndicator: true,
  timezone: 'Europe/Amsterdam',
  elements: createDefaultClockElements(),
};

const normalizeConfig = (raw: Partial<DeviceConfig>): DeviceConfig => ({
  schemaVersion: raw.schemaVersion ?? 4,
  display: {
    ...defaultDisplay,
    ...(raw.display ?? {}),
    brightnessSchedule: raw.display?.brightnessSchedule ?? defaultDisplay.brightnessSchedule,
  },
  clock: {
    ...defaultClock,
    ...(raw.clock ?? {}),
    elements: raw.clock?.elements ?? defaultClock.elements,
  },
  layouts: Array.isArray(raw.layouts) ? raw.layouts : createDefaultLayouts(),
  rules: Array.isArray(raw.rules) ? raw.rules : [],
  profiles: Array.isArray(raw.profiles) ? raw.profiles : createDefaultProfiles(),
  activeLayoutId: raw.activeLayoutId ?? 'clock-classic',
  activeProfileId: raw.activeProfileId ?? 'normal',
  idleRotation: raw.idleRotation ?? [],
});

export class Esp32DeviceApi implements DeviceApi {
  private listeners = new Set<() => void>();

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = (await response.json()) as { data?: T; error?: { message?: string } } & T;
    if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`);
    return (body.data ?? body) as T;
  }

  async getStatus() { return normalizeStatus(await this.request<RawRecord>('/api/v1/status')); }
  async getAudioStatus(): Promise<AudioStatus> {
    try {
      return await this.request<AudioStatus>('/api/v1/audio');
    } catch {
      return { available: false, initialized: false, microphoneCount: 0, inputCodec: '—', outputCodec: '—', speakerConnected: false, state: 'IDLE', inputLevel: 0, volume: 0, transport: 'none', error: 'Audiofirmware nog niet geactiveerd' };
    }
  }
  async startAssist() { return this.request<AudioStatus>('/api/v1/audio/assist/start', { method: 'POST' }); }
  async stopAssist() { return this.request<AudioStatus>('/api/v1/audio/assist/stop', { method: 'POST' }); }
  async playAudioTest() { return this.request<AudioStatus>('/api/v1/audio/test', { method: 'POST' }); }
  async setVolume(volume: number) { return this.request<AudioStatus>('/api/v1/audio/volume', { method: 'PUT', body: JSON.stringify({ volume }) }); }
  async getWifi() { return normalizeWifi(await this.request<RawRecord>('/api/v1/wifi')); }
  async updateWifi(input: WifiUpdate) {
    await this.request('/api/v1/wifi', { method: 'PUT', body: JSON.stringify(input) });
  }
  async getConfig() { return normalizeConfig(await this.request<Partial<DeviceConfig>>('/api/v1/config')); }
  async updateConfig(patch: Partial<DeviceConfig>) {
    return normalizeConfig(await this.request<Partial<DeviceConfig>>('/api/v1/config', { method: 'PUT', body: JSON.stringify(patch) }));
  }
  async sendMessage(message: Message) {
    return this.request<Message>('/api/v1/message', { method: 'POST', body: JSON.stringify(message) });
  }
  async sendEvent(event: EventInput) {
    return this.request<DisplayEvent>('/api/v1/events', { method: 'POST', body: JSON.stringify(event) });
  }
  async clearDisplay() {
    await this.request('/api/v1/clear', { method: 'POST' });
  }
  async skipEvent() {
    await this.request('/api/v1/events/skip', { method: 'POST' });
  }
  async reboot() {
    await this.request('/api/v1/restart', { method: 'POST' });
  }
  async getLogs() {
    const raw = await this.request<Array<RawRecord>>('/api/v1/logs');
    return raw.map((entry, index) => ({
      id: String(entry.id ?? `${entry.uptime ?? 'log'}-${index}`),
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : '',
      uptime: typeof entry.uptime === 'number' ? entry.uptime : undefined,
      category: String(entry.category ?? 'SYSTEM') as LogEntry['category'],
      level: String(entry.level ?? 'INFO') as LogEntry['level'],
      message: String(entry.message ?? ''),
    }));
  }
  async getLayouts() { return this.request<LayoutModel[]>('/api/v1/layouts'); }
  async saveLayout(layout: LayoutModel) {
    return this.request<LayoutModel>(`/api/v1/layouts/${encodeURIComponent(layout.id)}`, { method: 'PUT', body: JSON.stringify(layout) });
  }
  async deleteLayout(layoutId: string) {
    await this.request(`/api/v1/layouts/${encodeURIComponent(layoutId)}`, { method: 'DELETE' });
  }
  async getEventHistory() { return this.request<EventHistoryEntry[]>('/api/v1/events/history'); }
  async getProfiles() { return this.request<DisplayProfile[]>('/api/v1/profiles'); }
  async updateProfile(profile: DisplayProfile) {
    return this.request<DisplayProfile>(`/api/v1/profiles/${encodeURIComponent(profile.id)}`, { method: 'PUT', body: JSON.stringify(profile) });
  }
  async getDiagnostics() { return this.request<DeviceDiagnostics>('/api/v1/diagnostics'); }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
