import type { DeviceConfig, DeviceStatus, LogEntry, Message } from '../../../shared/schemas/models';
import type { DeviceApi } from './deviceApi';

type RawRecord = Record<string, unknown>;

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const pick = <T,>(raw: RawRecord, camel: string, snake: string, fallback: T): T =>
  (raw[camel] ?? raw[snake] ?? fallback) as T;

const normalizeStatus = (raw: RawRecord): DeviceStatus => ({
  online: pick(raw, 'online', 'online', true),
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
  activeMessage: raw.activeMessage as Message | undefined,
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
  async getConfig() { return this.request<DeviceConfig>('/api/v1/config'); }
  async updateConfig(patch: Partial<DeviceConfig>) {
    return this.request<DeviceConfig>('/api/v1/config', { method: 'PUT', body: JSON.stringify(patch) });
  }
  async sendMessage(message: Message) {
    return this.request<Message>('/api/v1/message', { method: 'POST', body: JSON.stringify(message) });
  }
  async clearDisplay() {
    await this.request('/api/v1/clear', { method: 'POST' });
  }
  async reboot() {
    await this.request('/api/v1/restart', { method: 'POST' });
  }
  async getLogs() { return this.request<LogEntry[]>('/api/v1/logs'); }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

